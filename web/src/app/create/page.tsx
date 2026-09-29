"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { parseEventLogs, parseUnits } from "viem";
import { appChain } from "@/config/chains";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, MAX_IMAGE_URL_LENGTH, MAX_TITLE_LENGTH, gavelAbi } from "@/config/contract";
import { NotConfigured } from "@/components/NotConfigured";
import { byteLength, currencyDecimals, currencySymbol } from "@/lib/format";
import { useTx } from "@/lib/useTx";

// Duration choices (all inside the contract's 5 minutes to 7 days range).
const DURATIONS = [
  { label: "15 minutes", seconds: 15 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "6 hours", seconds: 6 * 60 * 60 },
  { label: "24 hours", seconds: 24 * 60 * 60 },
  { label: "3 days", seconds: 3 * 24 * 60 * 60 },
];

/** Parse a positive decimal amount with at most `decimals` places. Returns undefined if invalid. */
function parseAmount(text: string, decimals: number): bigint | undefined {
  const t = text.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  const fraction = t.split(".")[1] ?? "";
  if (fraction.length > decimals) return undefined;
  const value = parseUnits(t, decimals);
  return value > BigInt(0) ? value : undefined;
}

/** /create: form to start a new auction. */
export default function CreatePage() {
  const router = useRouter();
  const { isConnected, chainId } = useAccount();
  const tx = useTx();

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [payInUsdc, setPayInUsdc] = useState(false);
  const [startPrice, setStartPrice] = useState("");
  const [minIncrement, setMinIncrement] = useState("");
  const [duration, setDuration] = useState(DURATIONS[1].seconds);
  const [formError, setFormError] = useState("");

  if (!GAVEL_ADDRESS) return <NotConfigured />;

  const decimals = currencyDecimals(payInUsdc);
  const symbol = currencySymbol(payInUsdc);

  /** Validate with the contract's limits, then call createAuction and go to the new auction. */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const cleanTitle = title.trim();
    const cleanUrl = imageUrl.trim();
    if (cleanTitle.length === 0) return setFormError("Please enter a title");
    if (byteLength(cleanTitle) > MAX_TITLE_LENGTH)
      return setFormError(`Title must be at most ${MAX_TITLE_LENGTH} bytes`);
    if (byteLength(cleanUrl) > MAX_IMAGE_URL_LENGTH)
      return setFormError(`Image URL must be at most ${MAX_IMAGE_URL_LENGTH} bytes`);
    const start = parseAmount(startPrice, decimals);
    if (start === undefined) return setFormError(`Start price must be a number above 0 (max ${decimals} decimals)`);
    const increment = parseAmount(minIncrement, decimals);
    if (increment === undefined)
      return setFormError(`Minimum increment must be a number above 0 (max ${decimals} decimals)`);

    const receipt = await tx.send(() =>
      tx.write({
        address: GAVEL_ADDRESS!,
        abi: gavelAbi,
        functionName: "createAuction",
        args: [cleanTitle, cleanUrl, payInUsdc, start, increment, BigInt(duration)],
        chainId: GAVEL_CHAIN_ID,
      }),
    );
    if (!receipt) return;

    // Read the new auction ID from the AuctionCreated event.
    const [created] = parseEventLogs({ abi: gavelAbi, eventName: "AuctionCreated", logs: receipt.logs });
    if (created) router.push(`/auction/${created.args.auctionId.toString()}`);
    else setFormError("Auction created, but its ID could not be read. Check the home page.");
  }

  const wrongNetwork = isConnected && chainId !== appChain.id;
  const urlNotShown = imageUrl.trim() !== "" && !imageUrl.trim().startsWith("https://");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-3xl font-bold">Create auction</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Title" hint={`${byteLength(title.trim())}/${MAX_TITLE_LENGTH} bytes`}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
        </Field>

        <Field label="Image URL (optional)" hint="Must start with https:// to be shown">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
          {urlNotShown && (
            <span className="text-xs text-amber-400">This image will not be shown because it is not https://</span>
          )}
        </Field>

        <Field label="Currency">
          <div className="flex gap-2">
            {[false, true].map((usdc) => (
              <button
                type="button"
                key={String(usdc)}
                onClick={() => setPayInUsdc(usdc)}
                className={`flex-1 rounded-lg border px-3 py-2 font-semibold ${
                  payInUsdc === usdc ? "border-violet-500 bg-violet-500/20" : "border-neutral-700"
                }`}
              >
                {currencySymbol(usdc)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Start price (${symbol})`}>
          <input
            value={startPrice}
            onChange={(e) => setStartPrice(e.target.value)}
            inputMode="decimal"
            placeholder={payInUsdc ? "10" : "0.5"}
            className={inputClass}
            required
          />
        </Field>

        <Field label={`Minimum increment (${symbol})`}>
          <input
            value={minIncrement}
            onChange={(e) => setMinIncrement(e.target.value)}
            inputMode="decimal"
            placeholder={payInUsdc ? "1" : "0.1"}
            className={inputClass}
            required
          />
        </Field>

        <Field label="Duration">
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputClass}>
            {DURATIONS.map((d) => (
              <option key={d.seconds} value={d.seconds}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>

        {formError && <p className="text-red-400">{formError}</p>}
        {tx.error && <p className="text-red-400">{tx.error}</p>}
        {!isConnected && <p className="text-neutral-400">Connect your wallet to create an auction.</p>}
        {wrongNetwork && <p className="text-amber-400">Switch your wallet to Monad to continue.</p>}

        <button
          type="submit"
          disabled={!isConnected || wrongNetwork || tx.busy}
          className="rounded-lg bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {tx.status === "wallet"
            ? "Waiting for wallet…"
            : tx.status === "confirming"
              ? "Confirming…"
              : "Create auction"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-violet-500";

/** Label + input wrapper. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-sm text-neutral-300">
        {label}
        {hint && <span className="text-neutral-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
