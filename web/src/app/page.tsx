"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { AuctionCard } from "@/components/AuctionCard";
import { NotConfigured } from "@/components/NotConfigured";
import { isLive, type Auction } from "@/lib/types";
import { useNow } from "@/lib/useNow";

// Auctions are loaded newest first, PAGE_SIZE at a time, so the page stays fast no matter
// how many auctions exist (audit W-01).
const PAGE_SIZE = 20;
// Modest refresh for the loaded auctions only.
const REFRESH_MS = 15_000;

/** Home page: the newest auctions (20 at a time), split into Live and Ended. */
export default function HomePage() {
  const now = useNow();
  const [pages, setPages] = useState(1);

  // 1. How many auctions exist?
  const count = useReadContract({
    address: GAVEL_ADDRESS,
    abi: gavelAbi,
    functionName: "auctionCount",
    chainId: GAVEL_CHAIN_ID,
    query: { enabled: Boolean(GAVEL_ADDRESS), refetchInterval: REFRESH_MS },
  });

  // 2. IDs to show: newest first, count down to count - pages*PAGE_SIZE + 1 (IDs start at 1).
  const total = Number(count.data ?? BigInt(0));
  const shown = Math.min(total, pages * PAGE_SIZE);
  const ids = Array.from({ length: shown }, (_, i) => BigInt(total - i));
  const hasMore = shown < total;

  // 3. Read the loaded auctions in one batched (multicall) request.
  const auctions = useReadContracts({
    contracts: ids.map((id) => ({
      address: GAVEL_ADDRESS,
      abi: gavelAbi,
      functionName: "getAuction" as const,
      args: [id] as const,
      chainId: GAVEL_CHAIN_ID,
    })),
    query: {
      enabled: Boolean(GAVEL_ADDRESS) && shown > 0,
      refetchInterval: REFRESH_MS,
      placeholderData: (previous) => previous, // keep showing loaded cards while "Load more" fetches
    },
  });

  // Remember which IDs the current data belongs to. While placeholder data is shown (after
  // "Load more" or when a new auction shifts the list), it still belongs to the previous IDs.
  const dataIds = useRef<bigint[]>([]);
  if (auctions.data && !auctions.isPlaceholderData) dataIds.current = ids;
  const idsForData = auctions.isPlaceholderData ? dataIds.current : ids;

  if (!GAVEL_ADDRESS) return <NotConfigured />;

  const loaded: { id: bigint; auction: Auction }[] = [];
  auctions.data?.forEach((r, i) => {
    const id = idsForData[i];
    if (r.status === "success" && id !== undefined) loaded.push({ id, auction: r.result as Auction });
  });
  const live = loaded.filter((x) => isLive(x.auction, now));
  const ended = loaded.filter((x) => !isLive(x.auction, now));

  const loading = count.isLoading || (total > 0 && auctions.isLoading && !auctions.data);
  const failed = count.isError || auctions.isError;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-bold">Live onchain auctions</h1>
        <p className="mt-1 text-neutral-400">Every bid is a Monad transaction. Late bids extend the clock.</p>
      </section>

      {failed && <p className="text-red-400">Could not load auctions from Monad. Please refresh.</p>}
      {loading && <p className="text-neutral-400">Loading auctions…</p>}

      {!loading && !failed && total === 0 && (
        <p className="text-neutral-400">
          No auctions yet.{" "}
          <Link href="/create" className="text-violet-400 underline">
            Create the first one
          </Link>
          .
        </p>
      )}

      {total > 0 && !loading && (
        <>
          <Section title="Live" items={live} now={now} empty="No live auctions right now." />
          <Section title="Ended" items={ended} now={now} empty="No ended auctions yet." />
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-neutral-500">
              Showing the newest {shown} of {total} auction{total === 1 ? "" : "s"}
            </p>
            {hasMore && (
              <button
                onClick={() => setPages((p) => p + 1)}
                disabled={auctions.isFetching}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:border-violet-400 disabled:opacity-50"
              >
                {auctions.isFetching ? "Loading…" : `Load ${Math.min(PAGE_SIZE, total - shown)} more`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** A titled grid of auction cards. */
function Section(props: { title: string; items: { id: bigint; auction: Auction }[]; now: number; empty: string }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">
        {props.title} <span className="text-neutral-500">({props.items.length})</span>
      </h2>
      {props.items.length === 0 ? (
        <p className="text-sm text-neutral-500">{props.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.items.map(({ id, auction }) => (
            <AuctionCard key={id.toString()} id={id} auction={auction} now={props.now} />
          ))}
        </div>
      )}
    </section>
  );
}
