"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { AuctionCard } from "@/components/AuctionCard";
import { Amount } from "@/components/Amount";
import { LiveDot } from "@/components/StatusBadge";
import { NotConfigured } from "@/components/NotConfigured";
import { isLive, type Auction } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { formatClock } from "@/lib/format";

// Auctions are loaded newest first, PAGE_SIZE at a time, so the page stays fast no matter
// how many auctions exist (audit W-01).
const PAGE_SIZE = 20;
// Modest refresh for the loaded auctions only.
const REFRESH_MS = 15_000;

/** /auctions: the newest auctions (20 at a time), split into Live and Ended. */
export default function AuctionsPage() {
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
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-hot/40 bg-hot/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-hot-soft">
            <LiveDot /> Live on Monad testnet
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,9vw,4.5rem)] font-extrabold leading-[0.92] tracking-tight">
            The auction <span className="text-lime">floor</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Every bid lands on Monad in about a second. Late bids put the clock back to 2:00, so nobody gets sniped.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/auctions#live"
            className="inline-flex min-h-12 items-center rounded-2xl bg-lime px-5 font-extrabold text-ink shadow-[0_10px_30px_-10px] shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-deep"
          >
            See what&apos;s live
          </Link>
          <Link
            href="/create"
            className="inline-flex min-h-12 items-center rounded-2xl border border-line bg-panel px-5 font-bold transition hover:-translate-y-0.5 hover:border-grape"
          >
            Sell something
          </Link>
        </div>
      </section>

      {!loading && !failed && <Ticker live={live} now={now} />}

      {failed && (
        <p role="alert" className="rounded-2xl border border-hot/50 bg-hot/10 p-4 font-semibold text-hot-soft">
          Could not load auctions from Monad. Please refresh.
        </p>
      )}
      {loading && (
        <div aria-live="polite">
          <p className="sr-only">Loading auctions…</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-line bg-panel">
                <div className="aspect-[4/3] animate-pulse bg-panel-2" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-panel-2" />
                  <div className="h-7 w-1/3 animate-pulse rounded bg-panel-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !failed && total === 0 && (
        <section
          id="live"
          className="relative overflow-hidden rounded-3xl border border-line bg-panel p-8 text-center sm:p-12"
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-grape/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-hot/20 blur-3xl" />
          <div aria-hidden className="relative text-6xl">
            🔨
          </div>
          <h2 className="relative mt-4 font-display text-3xl font-extrabold sm:text-4xl">The floor is empty</h2>
          <p className="relative mx-auto mt-2 max-w-md text-muted">
            No auctions yet. Be the first to drop the gavel: list an item in under a minute.
          </p>
          <Link
            href="/create"
            className="relative mt-6 inline-flex rounded-2xl bg-lime px-6 py-3.5 font-extrabold text-ink shadow-[0_10px_30px_-10px] shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-deep"
          >
            Create the first one
          </Link>
        </section>
      )}

      {total > 0 && !loading && (
        <>
          <Section
            id="live"
            title="Live now"
            live
            items={live}
            now={now}
            empty="Nothing is live right now. Start an auction and get the bidding going."
          />
          <Section id="ended" title="Ended" items={ended} now={now} empty="No ended auctions yet." />
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-dim">
              Showing the newest {shown} of {total} auction{total === 1 ? "" : "s"}
            </p>
            {hasMore && (
              <button
                onClick={() => setPages((p) => p + 1)}
                disabled={auctions.isFetching}
                className="rounded-2xl border border-line bg-panel px-6 py-3 font-bold transition hover:border-grape hover:bg-panel-2 disabled:opacity-50"
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

/** Scrolling "live bid ticker": live auctions and their prices, or how Gavel works when nothing is live. */
function Ticker({ live, now }: { live: { id: bigint; auction: Auction }[]; now: number }) {
  const items =
    live.length > 0
      ? live.map(({ id, auction }) => (
          <Link
            key={id.toString()}
            href={`/auction/${id.toString()}`}
            className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 hover:bg-white/10"
          >
            <span className="font-bold text-hot">●</span>
            <span className="max-w-[14rem] truncate font-semibold">{auction.title}</span>
            <Amount
              amount={auction.bidCount > 0 ? auction.highestBid : auction.startPrice}
              payInUsdc={auction.payInUsdc}
              className="font-mono font-bold text-lime"
              symbolClassName="text-xs text-lime/80"
            />
            <span className="tabular font-mono text-muted">{now ? formatClock(Number(auction.endTime) - now) : "…"}</span>
          </Link>
        ))
      : [
          "Every bid is onchain",
          "Late bids reset the clock to 2:00",
          "Pay in MON or USDC",
          "Outbid? Your money comes back to you",
          "Winner and seller settle in one tap",
        ].map((t) => (
          <span key={t} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-2 font-semibold">
            <span aria-hidden className="text-lime">
              ✦
            </span>
            {t}
          </span>
        ));

  return (
    <div
      className="marquee bleed relative overflow-hidden border-y border-line bg-panel/80 py-1 text-sm sm:mx-0 sm:rounded-2xl sm:border"
      aria-label={live.length > 0 ? "Live auctions ticker" : "How Gavel works"}
    >
      <div className="marquee-track flex w-max gap-6 px-3 motion-safe:animate-marquee">
        <div className="flex gap-6">
          {items}
          {/* Short lists are repeated so the loop always fills a wide screen. */}
          {items.length < 6 && (
            <div className="marquee-dup flex gap-6" aria-hidden inert>
              {items}
            </div>
          )}
        </div>
        <div className="marquee-dup flex gap-6" aria-hidden inert>
          {items}
          {items.length < 6 && <div className="flex gap-6">{items}</div>}
        </div>
      </div>
    </div>
  );
}

/** A titled grid of auction cards. */
function Section(props: {
  id: string;
  title: string;
  live?: boolean;
  items: { id: bigint; auction: Auction }[];
  now: number;
  empty: string;
}) {
  return (
    <section id={props.id} className="scroll-mt-24">
      <h2 className="mb-4 flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight">
        {props.live && <LiveDot />}
        {props.title}
        <span
          className={`rounded-full px-2.5 py-0.5 font-sans text-sm font-bold ${
            props.live ? "bg-hot text-white" : "bg-panel-2 text-muted"
          }`}
        >
          {props.items.length}
        </span>
      </h2>
      {props.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">{props.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {props.items.map(({ id, auction }) => (
            <AuctionCard key={id.toString()} id={id} auction={auction} now={props.now} />
          ))}
        </div>
      )}
    </section>
  );
}
