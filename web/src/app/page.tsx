"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { AuctionCard } from "@/components/AuctionCard";
import { NotConfigured } from "@/components/NotConfigured";
import { isLive, type Auction } from "@/lib/types";
import { useNow } from "@/lib/useNow";

/** Home page: every auction, split into Live and Ended. */
export default function HomePage() {
  const now = useNow();

  // 1. How many auctions exist?
  const count = useReadContract({
    address: GAVEL_ADDRESS,
    abi: gavelAbi,
    functionName: "auctionCount",
    chainId: GAVEL_CHAIN_ID,
    query: { enabled: Boolean(GAVEL_ADDRESS), refetchInterval: 10_000 },
  });

  // 2. Read every auction in one batched (multicall) request.
  const total = Number(count.data ?? BigInt(0));
  const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));
  const auctions = useReadContracts({
    contracts: ids.map((id) => ({
      address: GAVEL_ADDRESS,
      abi: gavelAbi,
      functionName: "getAuction" as const,
      args: [id] as const,
      chainId: GAVEL_CHAIN_ID,
    })),
    query: { enabled: Boolean(GAVEL_ADDRESS) && total > 0, refetchInterval: 10_000 },
  });

  if (!GAVEL_ADDRESS) return <NotConfigured />;

  const loaded: { id: bigint; auction: Auction }[] = [];
  auctions.data?.forEach((r, i) => {
    if (r.status === "success") loaded.push({ id: ids[i], auction: r.result as Auction });
  });
  // Newest first.
  loaded.reverse();
  const live = loaded.filter((x) => isLive(x.auction, now));
  const ended = loaded.filter((x) => !isLive(x.auction, now));

  const loading = count.isLoading || (total > 0 && auctions.isLoading);
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
