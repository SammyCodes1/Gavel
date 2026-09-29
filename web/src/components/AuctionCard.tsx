"use client";

import Link from "next/link";
import type { Auction } from "@/lib/types";
import { formatClock } from "@/lib/format";
import { AuctionImage } from "./AuctionImage";
import { Amount } from "./Amount";
import { CurrencyBadge } from "./CurrencyBadge";
import { StatusBadge, auctionPhase } from "./StatusBadge";

/** Card on the home page. Clicking opens /auction/[id]. */
export function AuctionCard({ id, auction, now }: { id: bigint; auction: Auction; now: number }) {
  const hasBids = auction.bidCount > 0;
  const price = hasBids ? auction.highestBid : auction.startPrice;
  const secondsLeft = Number(auction.endTime) - now;
  const phase = auctionPhase(auction, now);
  const active = phase === "live" || phase === "closing";

  let status: string;
  if (auction.cancelled) status = "Cancelled by seller";
  else if (auction.settled) status = hasBids ? "Sold" : "Closed";
  else if (now === 0) status = "…";
  else if (secondsLeft > 0) status = formatClock(secondsLeft);
  else status = "Waiting to settle";

  return (
    <Link
      href={`/auction/${id.toString()}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-panel transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px] ${
        active
          ? "border-line hover:border-grape hover:shadow-grape"
          : "border-line/60 hover:border-line hover:shadow-black"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-panel-2">
        <AuctionImage
          url={auction.imageUrl}
          alt={auction.title}
          fallback
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${active ? "" : "grayscale-[60%]"}`}
          fallbackClassName={`h-full w-full ${active ? "" : "opacity-60 grayscale-[60%]"}`}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <StatusBadge phase={phase} hasBids={hasBids} />
          <CurrencyBadge payInUsdc={auction.payInUsdc} />
        </div>
        {active && (
          <div
            className={`tabular absolute bottom-3 right-3 rounded-xl px-3 py-1.5 font-mono text-lg font-bold backdrop-blur ${
              phase === "closing" ? "bg-hot text-white motion-safe:animate-urgent" : "bg-ink/80 text-fg"
            }`}
          >
            <span className="sr-only">Ends in </span>
            {status}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 break-words font-display text-lg font-bold leading-tight">{auction.title}</h3>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-dim">
              {hasBids ? (auction.settled ? "Winning bid" : "Top bid") : "Starting at"}
            </div>
            <Amount
              amount={price}
              payInUsdc={auction.payInUsdc}
              className={`font-display text-2xl font-extrabold ${active ? "text-fg" : "text-muted"}`}
            />
          </div>
          <div className="shrink-0 text-right text-xs text-muted">
            <div className="font-bold text-fg">
              {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"}
            </div>
            {!active && <div>{status}</div>}
          </div>
        </div>
      </div>
    </Link>
  );
}
