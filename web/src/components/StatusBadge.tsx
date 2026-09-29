import type { Auction } from "@/lib/types";
import { EXTENSION_TIME_SECONDS } from "@/config/contract";

/** The display state of an auction. Purely visual; derived from the same fields the pages already use. */
export type Phase = "loading" | "live" | "closing" | "ended" | "settled" | "cancelled";

/** Work out the display phase. "closing" is the last 2 minutes (the anti-snipe window). */
export function auctionPhase(auction: Auction, now: number): Phase {
  if (auction.cancelled) return "cancelled";
  if (auction.settled) return "settled";
  if (now === 0) return "loading";
  const left = Number(auction.endTime) - now;
  if (left <= 0) return "ended";
  if (left <= EXTENSION_TIME_SECONDS) return "closing";
  return "live";
}

/** A pulsing dot, used next to "LIVE". */
export function LiveDot({ className = "bg-hot" }: { className?: string }) {
  return (
    <span aria-hidden className="relative inline-flex h-2 w-2">
      <span className={`absolute inset-0 rounded-full motion-safe:animate-live-ring ${className}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}

const STYLES: Record<Phase, { label: string; className: string }> = {
  loading: { label: "…", className: "bg-panel-2 text-muted" },
  live: { label: "Live", className: "bg-hot text-white shadow-[0_0_20px_-4px] shadow-hot" },
  closing: { label: "Ending now", className: "bg-sun text-ink shadow-[0_0_20px_-4px] shadow-sun" },
  ended: { label: "Bidding closed", className: "bg-panel-2 text-sun ring-1 ring-inset ring-sun/50" },
  settled: { label: "Sold · settled", className: "bg-lime text-ink" },
  cancelled: { label: "Cancelled", className: "bg-panel-2 text-dim ring-1 ring-inset ring-line line-through" },
};

/** Loud status pill: LIVE / ENDING NOW / BIDDING CLOSED / SOLD / CANCELLED. */
export function StatusBadge({ phase, hasBids = true }: { phase: Phase; hasBids?: boolean }) {
  const style = STYLES[phase];
  const label = phase === "settled" && !hasBids ? "Closed · no bids" : style.label;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${style.className}`}
    >
      {(phase === "live" || phase === "closing") && <LiveDot className={phase === "live" ? "bg-white" : "bg-ink"} />}
      {label}
    </span>
  );
}
