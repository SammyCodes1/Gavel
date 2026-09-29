"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { parseEventLogs, parseUnits } from "viem";
import { appChain } from "@/config/chains";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, MAX_IMAGE_URL_LENGTH, MAX_TITLE_LENGTH, gavelAbi } from "@/config/contract";
import { NotConfigured } from "@/components/NotConfigured";
import { AuctionImage } from "@/components/AuctionImage";
import { CurrencyBadge } from "@/components/CurrencyBadge";
import { byteLength, currencyDecimals, currencySymbol } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { PhotoUpload } from "@/components/PhotoUpload";

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
    else setFormError("Auction created, but its ID could not be read. Check the auctions page.");
  }

  const wrongNetwork = isConnected && chainId !== appChain.id;
  const urlNotShown = imageUrl.trim() !== "" && !imageUrl.trim().startsWith("https://");

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime">Sell on Gavel</p>
        <h1 className="mt-2 font-display text-[clamp(2.25rem,8vw,3.75rem)] font-extrabold leading-[0.95] tracking-tight">
          Create auction
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          Set a starting price, pick how long it runs, and let the bids roll in. Every bid is a Monad transaction.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6">
          <Field label="What are you selling?" hint={`${byteLength(title.trim())}/${MAX_TITLE_LENGTH} bytes`}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Signed vinyl, first pressing"
              className={inputClass}
              required
            />
          </Field>

          <Group label="Photo (optional)">
            <PhotoUpload onUploaded={setImageUrl} disabled={tx.busy} />
            <Field label="or paste a link" hint="Must start with https:// to be shown">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
              {urlNotShown && (
                <span className="text-xs font-semibold text-sun">
                  This image will not be shown because it is not https://
                </span>
              )}
            </Field>
          </Group>

          <Group label="Get paid in">
            <div className="grid grid-cols-2 gap-3">
              {[false, true].map((usdc) => (
                <button
                  type="button"
                  key={String(usdc)}
                  onClick={() => setPayInUsdc(usdc)}
                  aria-pressed={payInUsdc === usdc}
                  className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition ${
                    payInUsdc === usdc
                      ? usdc
                        ? "border-usdc bg-usdc/15"
                        : "border-grape bg-grape/15"
                      : "border-line bg-panel hover:border-muted"
                  }`}
                >
                  <CurrencyBadge payInUsdc={usdc} size="lg" />
                  <span className="text-sm text-muted">{usdc ? "Digital dollars" : "Monad's native coin"}</span>
                </button>
              ))}
            </div>
          </Group>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
          </div>

          <Group label="How long should it run?">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d.seconds}
                  onClick={() => setDuration(d.seconds)}
                  aria-pressed={duration === d.seconds}
                  className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition ${
                    duration === d.seconds
                      ? "border-lime bg-lime text-ink"
                      : "border-line bg-panel text-muted hover:border-muted hover:text-fg"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Group>

          <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
            {formError && (
              <p role="alert" className="rounded-xl border border-hot/50 bg-hot/10 px-4 py-3 font-semibold text-hot-soft">
                {formError}
              </p>
            )}
            {tx.error && (
              <p role="alert" className="rounded-xl border border-hot/50 bg-hot/10 px-4 py-3 font-semibold text-hot-soft">
                {tx.error}
              </p>
            )}
            {!isConnected && <p className="text-muted">Connect your wallet to create an auction.</p>}
            {wrongNetwork && <p className="font-semibold text-sun">Switch your wallet to Monad to continue.</p>}
          </div>

          <button
            type="submit"
            disabled={!isConnected || wrongNetwork || tx.busy}
            className="rounded-2xl bg-lime px-5 py-4 font-display text-xl font-extrabold text-ink shadow-[0_12px_32px_-12px] shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-deep disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-dim disabled:shadow-none"
          >
            {tx.status === "wallet"
              ? "Waiting for wallet…"
              : tx.status === "confirming"
                ? "Confirming…"
                : "Create auction"}
          </button>
        </form>
      </div>

      {/* Live preview of the card buyers will see (display only). */}
      <aside className="lg:col-span-2" aria-label="Preview">
        <div className="lg:sticky lg:top-24">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-dim">Preview</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-panel">
            <div className="relative aspect-[4/3] bg-panel-2">
              <AuctionImage
                url={imageUrl.trim()}
                alt={title.trim() || "Your item"}
                fallback
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-hot px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                  Live
                </span>
                <CurrencyBadge payInUsdc={payInUsdc} />
              </div>
              <div className="tabular absolute bottom-3 right-3 rounded-xl bg-ink/80 px-3 py-1.5 font-mono text-lg font-bold">
                {DURATIONS.find((d) => d.seconds === duration)?.label}
              </div>
            </div>
            <div className="p-4">
              <h2 className="line-clamp-2 break-words font-display text-lg font-bold leading-tight">
                {title.trim() || "Your item title"}
              </h2>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-dim">Starting at</div>
              <div className="font-display text-2xl font-extrabold [overflow-wrap:anywhere]">
                {startPrice.trim() || "0"} <span className="text-sm text-muted">{symbol}</span>
              </div>
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li>⚡ Bids confirm on Monad in about a second.</li>
            <li>⏱ A bid in the last 2 minutes puts the clock back to 2:00.</li>
            <li>💸 Outbid bidders collect their money back any time.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border-2 border-line bg-panel px-4 py-3 text-base text-fg placeholder:text-dim outline-none transition focus:border-lime focus-visible:outline-none";

/** Label + input wrapper. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-bold text-fg">
        {label}
        {hint && <span className="text-xs font-medium text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Label for a group of choice buttons. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold text-fg">{label}</legend>
      {children}
    </fieldset>
  );
}
