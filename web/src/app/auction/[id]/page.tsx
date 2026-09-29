"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { appChain, explorerAddressUrl } from "@/config/chains";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { AuctionImage } from "@/components/AuctionImage";
import { BidBox } from "@/components/BidBox";
import { BidFeed } from "@/components/BidFeed";
import { CurrencyBadge } from "@/components/CurrencyBadge";
import { NotConfigured } from "@/components/NotConfigured";
import { Amount } from "@/components/Amount";
import { StatusBadge, auctionPhase } from "@/components/StatusBadge";
import { formatAmount, formatClock, shortAddress } from "@/lib/format";
import type { Auction } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useTx } from "@/lib/useTx";

/** Parse the [id] route param. Returns undefined if it is not a positive integer. */
function parseId(raw: string | string[] | undefined): bigint | undefined {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (!text || !/^\d{1,30}$/.test(text)) return undefined;
  const id = BigInt(text);
  return id > BigInt(0) ? id : undefined;
}

/** /auction/[id]: details, live countdown, bid box, live feed, settle and cancel. */
export default function AuctionPage() {
  const params = useParams<{ id: string }>();
  const auctionId = parseId(params.id);
  const now = useNow();
  const { address, isConnected, chainId } = useAccount();
  const settleTx = useTx();
  const cancelTx = useTx();
  const [extendedAt, setExtendedAt] = useState(0);

  const { data, isLoading, isError, refetch } = useReadContract({
    address: GAVEL_ADDRESS,
    abi: gavelAbi,
    functionName: "getAuction",
    args: [auctionId ?? BigInt(0)],
    chainId: GAVEL_CHAIN_ID,
    query: {
      enabled: Boolean(GAVEL_ADDRESS && auctionId),
      // Refetch every 5 seconds while live: anti-sniping can move endTime.
      refetchInterval: (query) => {
        const a = query.state.data as Auction | undefined;
        if (!a) return 5_000;
        const live = !a.settled && !a.cancelled && Number(a.endTime) > Date.now() / 1000 - 10;
        return live ? 5_000 : false;
      },
    },
  });
  const auction = data as Auction | undefined;

  // Detect extensions that arrive through polling (e.g. from another window).
  const lastEnd = useRef<bigint | undefined>(undefined);
  useEffect(() => {
    if (!auction) return;
    if (lastEnd.current !== undefined && auction.endTime > lastEnd.current) setExtendedAt(Date.now());
    lastEnd.current = auction.endTime;
  }, [auction]);

  // Hide the "Extended" notice after 10 seconds.
  useEffect(() => {
    if (!extendedAt) return;
    const t = setTimeout(() => setExtendedAt(0), 10_000);
    return () => clearTimeout(t);
  }, [extendedAt]);

  if (!GAVEL_ADDRESS) return <NotConfigured />;
  if (!auctionId) return <Message title="Auction not found" text="That link doesn't point to a valid auction." />;
  if (isLoading) return <LoadingAuction />;
  if (isError)
    return <Message title="Couldn't reach Monad" text="Could not load this auction from Monad. Please refresh." error />;
  if (!auction || auction.seller === "0x0000000000000000000000000000000000000000")
    return <Message title="Auction not found" text="There is no auction with this number yet." />;

  const secondsLeft = Number(auction.endTime) - now;
  const ended = now > 0 && secondsLeft <= 0;
  const isSeller = address?.toLowerCase() === auction.seller.toLowerCase();
  const wrongNetwork = isConnected && chainId !== appChain.id;
  const hasBids = auction.bidCount > 0;
  const canAct = isConnected && !wrongNetwork;
  const phase = auctionPhase(auction, now);
  const youLead = hasBids && address?.toLowerCase() === auction.highestBidder.toLowerCase();

  let statusText: string;
  if (auction.cancelled) statusText = "Cancelled";
  else if (auction.settled) statusText = hasBids ? "Sold" : "Closed";
  else if (now === 0) statusText = "--:--";
  else if (ended) statusText = "00:00";
  else statusText = formatClock(secondsLeft);

  const clockLabel =
    phase === "closing"
      ? "Final seconds · any bid adds 2 min"
      : phase === "live" || phase === "loading"
        ? "Time left"
        : phase === "ended"
          ? "Bidding closed"
          : phase === "settled"
            ? "Auction finished"
            : "Auction called off";

  const panelStyle: Record<typeof phase, string> = {
    loading: "border-line bg-panel",
    live: "border-grape/60 bg-gradient-to-br from-grape/35 via-panel to-panel",
    closing: "border-hot bg-gradient-to-br from-hot/45 via-hot/15 to-panel shadow-[0_0_60px_-15px] shadow-hot",
    ended: "border-sun/50 bg-gradient-to-br from-sun/15 via-panel to-panel",
    settled: "border-lime/60 bg-gradient-to-br from-lime/20 via-panel to-panel",
    cancelled: "border-line bg-panel",
  };
  const clockColor: Record<typeof phase, string> = {
    loading: "text-muted",
    live: "text-fg",
    closing: "text-white motion-safe:animate-urgent",
    ended: "text-sun",
    settled: "text-lime",
    cancelled: "text-dim line-through decoration-4",
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="w-fit rounded-lg text-sm font-semibold text-muted transition hover:text-fg"
      >
        ← All auctions
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:grid-rows-[auto_1fr] lg:gap-8">
        {/* Title and photo */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge phase={phase} hasBids={hasBids} />
            <CurrencyBadge payInUsdc={auction.payInUsdc} size="md" />
            <span className="text-sm font-semibold text-dim">#{auctionId.toString()}</span>
          </div>
          <h1 className="break-words font-display text-[clamp(2rem,7vw,3.5rem)] font-extrabold leading-[0.95] tracking-tight">
            {auction.title}
          </h1>
          <p className="text-sm text-muted">
            Sold by{" "}
            <a
              href={explorerAddressUrl(auction.seller)}
              target="_blank"
              rel="noreferrer"
              className="rounded font-mono font-semibold text-grape-soft hover:underline"
            >
              {shortAddress(auction.seller)}
            </a>
            {isSeller && (
              <span className="ml-2 rounded-full bg-grape/25 px-2 py-0.5 text-xs font-bold text-grape-soft">you</span>
            )}
          </p>
          <AuctionImage
            url={auction.imageUrl}
            alt={auction.title}
            fallback
            className="max-h-[28rem] w-full rounded-3xl border border-line bg-panel object-contain"
            fallbackClassName="h-48 w-full rounded-3xl border border-line sm:h-72"
          />
        </div>

        {/* Countdown, price and bidding */}
        <div className="flex flex-col gap-4 lg:col-span-2 lg:col-start-4 lg:row-span-2 lg:row-start-1">
          <section
            aria-label="Countdown"
            className={`relative overflow-hidden rounded-3xl border p-5 text-center transition-colors duration-500 sm:p-6 ${panelStyle[phase]}`}
          >
            <div
              className={`text-xs font-extrabold uppercase tracking-[0.18em] ${
                phase === "closing" ? "text-white" : "text-muted"
              }`}
            >
              {clockLabel}
            </div>
            <div
              role="timer"
              aria-live="off"
              className={`tabular mt-1 whitespace-nowrap font-mono font-extrabold leading-none tracking-tight ${
                statusText.length > 5 ? "text-[clamp(2.75rem,13vw,4.75rem)]" : "text-[clamp(4rem,22vw,7rem)]"
              } ${clockColor[phase]}`}
            >
              {statusText}
            </div>
            {extendedAt > 0 && (
              <div
                role="status"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-sun px-4 py-1.5 text-sm font-extrabold text-ink motion-safe:animate-pop"
              >
                <span aria-hidden>⏱</span> Late bid! Extended by 2 minutes
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-ink/60 p-4 text-left ring-1 ring-inset ring-white/5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-dim">
                  {hasBids ? (auction.settled ? "Winning bid" : "Highest bid") : "Start price"}
                </span>
                <span className="text-xs font-bold text-muted">
                  {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"}
                </span>
              </div>
              <div aria-live="polite" className="mt-1">
                <Amount
                  key={`${auction.highestBid}-${auction.bidCount}`}
                  amount={hasBids ? auction.highestBid : auction.startPrice}
                  payInUsdc={auction.payInUsdc}
                  className={`-mx-1 rounded-lg px-1 font-display text-4xl font-extrabold sm:text-5xl ${
                    hasBids ? "motion-safe:animate-flash" : ""
                  }`}
                />
              </div>
              <div className="mt-1 text-sm text-muted">
                {hasBids ? (
                  <>
                    by{" "}
                    <a
                      href={explorerAddressUrl(auction.highestBidder)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded font-mono font-semibold text-fg hover:text-grape-soft"
                    >
                      {shortAddress(auction.highestBidder)}
                    </a>
                    {youLead && (
                      <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-extrabold text-ink">
                        {auction.settled || ended ? "You won" : "You're winning"}
                      </span>
                    )}
                  </>
                ) : (
                  "No bids yet. Be the first!"
                )}
              </div>
            </div>
          </section>

          {(ended || auction.settled) && !auction.cancelled && (
            <section
              className={`rounded-3xl border p-5 ${
                auction.settled ? "border-lime/50 bg-lime/10" : "border-sun/50 bg-sun/10"
              }`}
            >
              <h2 className="font-display text-xl font-extrabold">
                {hasBids ? (auction.settled ? "🏆 Sold!" : "🏁 We have a winner") : "No bids were placed."}
              </h2>
              {hasBids && (
                <p className="mt-1 text-muted">
                  Winner: <span className="font-mono font-semibold text-fg">{shortAddress(auction.highestBidder)}</span>{" "}
                  with <span className="font-bold text-fg">{formatAmount(auction.highestBid, auction.payInUsdc)}</span>
                </p>
              )}
              {!auction.settled && (
                <div className="mt-4">
                  <p className="mb-3 text-sm text-muted">
                    Bidding is over. Anyone can settle it to finish the auction onchain.
                  </p>
                  <button
                    onClick={() =>
                      settleTx.send(() =>
                        settleTx.write({
                          address: GAVEL_ADDRESS!,
                          abi: gavelAbi,
                          functionName: "settle",
                          args: [auctionId],
                          chainId: GAVEL_CHAIN_ID,
                        }),
                      )
                    }
                    disabled={!canAct || settleTx.busy}
                    className="w-full rounded-2xl bg-sun px-5 py-3.5 text-lg font-extrabold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {settleTx.status === "wallet"
                      ? "Waiting for wallet…"
                      : settleTx.status === "confirming"
                        ? "Confirming…"
                        : "Settle auction"}
                  </button>
                  {!canAct && <p className="mt-2 text-sm text-muted">Connect your wallet on Monad to settle.</p>}
                  {settleTx.error && (
                    <p role="alert" className="mt-2 text-sm text-hot-soft">
                      {settleTx.error}
                    </p>
                  )}
                </div>
              )}
              {auction.settled && hasBids && (
                <p className="mt-2 text-sm text-muted">
                  Settled. The seller can collect the winning bid from the banner at the top. Item delivery is arranged
                  between seller and winner.
                </p>
              )}
            </section>
          )}

          {auction.cancelled && (
            <section className="rounded-3xl border border-line bg-panel p-5">
              <h2 className="font-display text-xl font-extrabold text-muted">This auction was cancelled</h2>
              <p className="mt-1 text-sm text-dim">The seller called it off before anyone bid.</p>
            </section>
          )}

          {!auction.settled && !auction.cancelled && <BidBox auctionId={auctionId} auction={auction} ended={ended} />}

          {isSeller && auction.bidCount === 0 && !auction.settled && !auction.cancelled && (
            <div>
              <button
                onClick={() =>
                  cancelTx.send(() =>
                    cancelTx.write({
                      address: GAVEL_ADDRESS!,
                      abi: gavelAbi,
                      functionName: "cancelAuction",
                      args: [auctionId],
                      chainId: GAVEL_CHAIN_ID,
                    }),
                  )
                }
                disabled={!canAct || cancelTx.busy}
                className="w-full rounded-2xl border border-hot/60 px-4 py-3 font-bold text-hot-soft transition hover:bg-hot/10 disabled:opacity-50"
              >
                {cancelTx.status === "wallet"
                  ? "Waiting for wallet…"
                  : cancelTx.status === "confirming"
                    ? "Confirming…"
                    : "Cancel auction"}
              </button>
              {cancelTx.error && (
                <p role="alert" className="mt-2 text-sm text-hot-soft">
                  {cancelTx.error}
                </p>
              )}
            </div>
          )}

          <BidFeed
            auctionId={auctionId}
            createdBlock={auction.createdBlock}
            bidCount={auction.bidCount}
            payInUsdc={auction.payInUsdc}
            onNewEvent={() => void refetch()}
            onExtended={() => setExtendedAt(Date.now())}
            live={phase === "live" || phase === "closing" || phase === "loading"}
          />
        </div>

        {/* Details */}
        <div className="lg:col-span-3 lg:col-start-1 lg:row-start-2 lg:self-start">
          <h2 className="mb-3 font-display text-xl font-extrabold">Details</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label={hasBids ? "Highest bid" : "Start price"}>
              {formatAmount(hasBids ? auction.highestBid : auction.startPrice, auction.payInUsdc)}
            </Stat>
            <Stat label="Highest bidder">
              {hasBids ? (
                <a
                  href={explorerAddressUrl(auction.highestBidder)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded font-mono hover:text-grape-soft"
                >
                  {shortAddress(auction.highestBidder)}
                  {youLead && " (you)"}
                </a>
              ) : (
                "None yet"
              )}
            </Stat>
            <Stat label="Bids">{auction.bidCount}</Stat>
            <Stat label="Min increment">{formatAmount(auction.minIncrement, auction.payInUsdc)}</Stat>
            <Stat label="Start price">{formatAmount(auction.startPrice, auction.payInUsdc)}</Stat>
            <Stat label="Currency">
              <CurrencyBadge payInUsdc={auction.payInUsdc} />
            </Stat>
          </dl>
          <p className="mt-4 rounded-2xl border border-line/60 bg-panel/60 p-4 text-sm text-muted">
            <span className="font-bold text-fg">How it works:</span> the highest bid when the clock hits zero wins. A bid
            in the last 2 minutes adds 2 minutes, so there&apos;s always time to answer. If you&apos;re outbid, your
            money is waiting for you to collect.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small label/value box. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3.5">
      <dt className="text-xs font-bold uppercase tracking-wider text-dim">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{children}</dd>
    </div>
  );
}

/** Friendly full-width message for not-found and error states. */
function Message({ title, text, error = false }: { title: string; text: string; error?: boolean }) {
  return (
    <div
      role={error ? "alert" : undefined}
      className={`mx-auto max-w-lg rounded-3xl border p-8 text-center ${
        error ? "border-hot/50 bg-hot/10" : "border-line bg-panel"
      }`}
    >
      <div aria-hidden className="text-5xl">
        {error ? "📡" : "🔍"}
      </div>
      <h1 className="mt-3 font-display text-3xl font-extrabold">{title}</h1>
      <p className={`mt-2 ${error ? "text-hot-soft" : "text-muted"}`}>{text}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-2xl bg-lime px-5 py-3 font-extrabold text-ink transition hover:bg-lime-deep"
      >
        Browse auctions
      </Link>
    </div>
  );
}

/** Skeleton while the auction loads. */
function LoadingAuction() {
  return (
    <div aria-live="polite" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <p className="sr-only">Loading auction…</p>
      <div aria-hidden className="flex flex-col gap-4 lg:col-span-3">
        <div className="h-6 w-40 animate-pulse rounded-full bg-panel-2" />
        <div className="h-12 w-3/4 animate-pulse rounded-xl bg-panel-2" />
        <div className="h-72 animate-pulse rounded-3xl bg-panel-2" />
      </div>
      <div aria-hidden className="h-80 animate-pulse rounded-3xl bg-panel-2 lg:col-span-2" />
    </div>
  );
}
