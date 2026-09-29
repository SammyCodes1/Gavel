"use client";

import Link from "next/link";
import type { Auction } from "@/lib/types";
import { formatAmount, formatDuration } from "@/lib/format";
import { AuctionImage } from "./AuctionImage";
import { CurrencyBadge } from "./CurrencyBadge";

/** Card on the home page. Clicking opens /auction/[id]. */
export function AuctionCard({ id, auction, now }: { id: bigint; auction: Auction; now: number }) {
  const hasBids = auction.bidCount > 0;
  const price = hasBids ? auction.highestBid : auction.startPrice;
  const secondsLeft = Number(auction.endTime) - now;

  let status: string;
  if (auction.cancelled) status = "Cancelled";
  else if (auction.settled) status = "Settled";
  else if (now === 0) status = "…";
  else if (secondsLeft > 0) status = `Ends in ${formatDuration(secondsLeft)}`;
  else status = "Ended, waiting to settle";

  return (
    <Link
      href={`/auction/${id.toString()}`}
      className="flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 hover:border-violet-500"
    >
      <AuctionImage url={auction.imageUrl} alt={auction.title} className="h-44 w-full object-cover" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words font-semibold">{auction.title}</h3>
          <CurrencyBadge payInUsdc={auction.payInUsdc} />
        </div>
        <div className="text-sm text-neutral-400">{hasBids ? "Highest bid" : "Start price"}</div>
        <div className="text-lg font-bold">{formatAmount(price, auction.payInUsdc)}</div>
        <div className="mt-auto flex justify-between text-xs text-neutral-400">
          <span>
            {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"}
          </span>
          <span>{status}</span>
        </div>
      </div>
    </Link>
  );
}
