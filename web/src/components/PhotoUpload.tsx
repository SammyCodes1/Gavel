"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { MAX_IMAGE_URL_LENGTH } from "@/config/contract";
import { byteLength } from "@/lib/format";
import { UPLOAD_CONTENT_TYPES, UPLOAD_MAX_BYTES, buildUploadMessage } from "@/lib/uploadMessage";

type Status = "checking" | "disabled" | "idle" | "preparing" | "signing" | "uploading" | "done" | "error";

const MAX_EDGE = 2000; // big photos are scaled down before upload

/** Turn any image the browser can decode into an upload-ready file (≤ 4 MB, JPG/PNG/WebP). */
async function prepareImage(file: File): Promise<Blob> {
  const allowed = (UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type);
  if (allowed && file.size <= UPLOAD_MAX_BYTES) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file isn't a photo we can read. Please choose a JPG, PNG or WebP image.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!out || out.size > UPLOAD_MAX_BYTES) throw new Error("That photo is too large. Please choose one under 4 MB.");
  return out;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  // data: URLs (not blob:) so the preview works under the site's img-src CSP.
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function safeName(name: string, type: string): string {
  const base =
    name
      .replace(/\.[^.]*$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "photo";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return `auctions/${/^[a-z0-9]/.test(base) ? base : `p${base}`}.${ext}`;
}

/**
 * Photo picker for /create: tap or drag a photo, sign a free wallet message, upload straight to
 * Vercel Blob, then hand the https URL back to the form's image URL field.
 */
export function PhotoUpload({ onUploaded, disabled }: { onUploaded: (url: string) => void; disabled?: boolean }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const helpId = useId();

  // Are uploads configured on this deployment?
  useEffect(() => {
    let cancelled = false;
    fetch("/api/upload", { cache: "no-store" })
      .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => !cancelled && setStatus(ok && d.enabled ? "idle" : "disabled"))
      .catch(() => !cancelled && setStatus("disabled"));
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = status === "preparing" || status === "signing" || status === "uploading";
  const canUpload = status !== "checking" && status !== "disabled" && isConnected && Boolean(address) && !disabled;

  async function handleFile(file: File | undefined) {
    if (!file || !address || busy) return;
    setError("");
    setProgress(0);
    try {
      setStatus("preparing");
      const blob = await prepareImage(file);
      setPreview(await readAsDataUrl(blob));

      // 1. Server-issued, short-lived nonce.
      const res = await fetch(`/api/upload/nonce?address=${address}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setStatus("disabled");
        return;
      }
      if (!res.ok || !data.nonce) throw new Error(data.error || "Couldn't start the upload. Please try again.");

      // 2. Free wallet signature (no transaction) proving who is uploading.
      setStatus("signing");
      const message = buildUploadMessage(window.location.host, address, data.nonce, data.expires);
      const signature = await signMessageAsync({ message });

      // 3. Upload straight to Vercel Blob with a token from /api/upload.
      setStatus("uploading");
      const type = blob.type || "image/jpeg";
      const { upload } = await import("@vercel/blob/client"); // loaded only when someone uploads
      const result = await upload(safeName(file.name, type), blob, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ address, message, signature }),
        contentType: type,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      if (!result.url.startsWith("https://") || byteLength(result.url) > MAX_IMAGE_URL_LENGTH)
        throw new Error("The uploaded photo link is too long to store. Please paste a shorter link instead.");
      onUploaded(result.url);
      setStatus("done");
    } catch (e) {
      const err = e as { name?: string; message?: string; shortMessage?: string };
      const rejected = err.name === "UserRejectedRequestError" || /reject|denied/i.test(err.message ?? "");
      setError(
        rejected
          ? "You cancelled the signature, so nothing was uploaded."
          : /client token/i.test(err.message ?? "")
            ? "The upload was refused (the request may have expired or the hourly limit was reached). Please try again."
            : err.shortMessage || err.message || "Upload failed. Please try again.",
      );
      setStatus("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (canUpload) void handleFile(e.dataTransfer.files?.[0]);
  }

  if (status === "checking") {
    return <div className="h-32 animate-pulse rounded-2xl border-2 border-dashed border-line bg-panel" aria-hidden />;
  }

  if (status === "disabled") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-line bg-panel p-4 text-sm">
        <span aria-hidden className="text-2xl">
          📷
        </span>
        <p className="text-muted">
          <span className="font-bold text-fg">Photo uploads aren&apos;t set up yet.</span> Paste a link to a photo
          below instead.
        </p>
      </div>
    );
  }

  const label =
    status === "preparing"
      ? "Getting your photo ready…"
      : status === "signing"
        ? "Confirm in your wallet (free, no transaction)"
        : status === "uploading"
          ? `Uploading… ${progress}%`
          : status === "done"
            ? "Photo added! Tap to replace it"
            : "Tap to choose a photo, or drag it here";

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (canUpload) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-disabled={!canUpload || busy}
        className={`group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed p-4 transition focus-within:border-lime focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-lime ${
          !canUpload || busy ? "cursor-not-allowed" : "cursor-pointer hover:border-grape"
        } ${dragging ? "border-lime bg-lime/10" : status === "done" ? "border-lime/60 bg-lime/5" : status === "error" ? "border-hot/60 bg-hot/5" : "border-line bg-panel"}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={!canUpload || busy}
          aria-describedby={helpId}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-panel-2">
          {preview ? (
            // data: URL preview of the chosen photo
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Chosen photo preview" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="text-4xl">
              📷
            </span>
          )}
          {status === "done" && (
            <span aria-hidden className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-lime text-xs font-extrabold text-ink">
              ✓
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-extrabold leading-tight">{label}</div>
          <p id={helpId} className="mt-1 text-xs text-dim">
            JPG, PNG or WebP, up to 4 MB. Big photos are shrunk automatically.
          </p>
          {status === "uploading" && (
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2"
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </label>
      {status === "done" && (
        <button
          type="button"
          onClick={() => {
            onUploaded("");
            setPreview("");
            setStatus("idle");
          }}
          className="min-h-11 self-start rounded-xl px-3 text-sm font-bold text-muted underline-offset-4 transition hover:text-fg hover:underline"
        >
          Remove photo
        </button>
      )}
      <div aria-live="polite" className="text-sm empty:hidden">
        {!isConnected && <p className="font-semibold text-sun">Connect your wallet to upload a photo.</p>}
        {status === "error" && error && (
          <p role="alert" className="font-semibold text-hot-soft">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
