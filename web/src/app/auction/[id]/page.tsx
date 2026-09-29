"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { appChain, explorerAddressUrl } from "@/config/chains";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { AuctionImage } from "@/components/AuctionImage";
import { BidBox } from "@/components/BidBox";
import { BidFeed } from "@/components/BidFeed";
import { CurrencyBadge } from "@/components/CurrencyBadge";
import { NotConfigured } from "@/components/NotConfigured";
import { formatAmount, formatDuration, shortAddress } from "@/lib/format";
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
  if (!auctionId) return <p className="text-neutral-400">Auction not found.</p>;
  if (isLoading) return <p className="text-neutral-400">Loading auction…</p>;
  if (isError) return <p className="text-red-400">Could not load this auction from Monad. Please refresh.</p>;
  if (!auction || auction.seller === "0x0000000000000000000000000000000000000000")
    return <p className="text-neutral-400">Auction not found.</p>;

  const secondsLeft = Number(auction.endTime) - now;
  const ended = now > 0 && secondsLeft <= 0;
  const isSeller = address?.toLowerCase() === auction.seller.toLowerCase();
  const wrongNetwork = isConnected && chainId !== appChain.id;
  const hasBids = auction.bidCount > 0;
  const canAct = isConnected && !wrongNetwork;

  let statusText: string;
  if (auction.cancelled) statusText = "Cancelled";
  else if (auction.settled) statusText = "Settled";
  else if (now === 0) statusText = "--";
  else if (ended) statusText = "Ended";
  else statusText = formatDuration(secondsLeft);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-3">
        <AuctionImage
          url={auction.imageUrl}
          alt={auction.title}
          className="max-h-96 w-full rounded-xl border border-neutral-800 object-contain"
        />
        <div className="flex items-start justify-between gap-3">
          <h1 className="break-words text-3xl font-bold">{auction.title}</h1>
          <CurrencyBadge payInUsdc={auction.payInUsdc} />
        </div>
        <p className="text-sm text-neutral-400">
          Seller:{" "}
          <a
            href={explorerAddressUrl(auction.seller)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-violet-400 hover:underline"
          >
            {shortAddress(auction.seller)}
          </a>
          {isSeller && " (you)"}
        </p>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-center">
          <div className="text-sm uppercase tracking-wide text-neutral-400">
            {auction.cancelled || auction.settled || ended ? "Status" : "Time left"}
          </div>
          <div
            className={`mt-1 font-mono text-5xl font-bold ${
              !ended && secondsLeft < 120 && now > 0 && !auction.settled && !auction.cancelled
                ? "text-amber-400"
                : "text-neutral-100"
            }`}
          >
            {statusText}
          </div>
          {extendedAt > 0 && (
            <div className="mt-2 inline-block rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
              Extended by 2 minutes
            </div>
          )}
        </div>

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
                className="font-mono hover:text-violet-400"
              >
                {shortAddress(auction.highestBidder)}
                {address?.toLowerCase() === auction.highestBidder.toLowerCase() && " (you)"}
              </a>
            ) : (
              "None yet"
            )}
          </Stat>
          <Stat label="Bids">{auction.bidCount}</Stat>
          <Stat label="Min increment">{formatAmount(auction.minIncrement, auction.payInUsdc)}</Stat>
          <Stat label="Currency">{auction.payInUsdc ? "USDC" : "MON"}</Stat>
        </dl>

        {(ended || auction.settled) && !auction.cancelled && (
          <div className="rounded-xl border border-violet-800 bg-violet-950/40 p-4">
            {hasBids ? (
              <p>
                Winner: <span className="font-mono">{shortAddress(auction.highestBidder)}</span> with{" "}
                <span className="font-bold">{formatAmount(auction.highestBid, auction.payInUsdc)}</span>
              </p>
            ) : (
              <p>No bids were placed.</p>
            )}
            {!auction.settled && (
              <div className="mt-3">
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
                  className="rounded-lg bg-violet-500 px-4 py-2 font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
                >
                  {settleTx.status === "wallet"
                    ? "Waiting for wallet…"
                    : settleTx.status === "confirming"
                      ? "Confirming…"
                      : "Settle auction"}
                </button>
                {!canAct && <p className="mt-2 text-sm text-neutral-400">Connect your wallet on Monad to settle.</p>}
                {settleTx.error && <p className="mt-2 text-sm text-red-400">{settleTx.error}</p>}
              </div>
            )}
            {auction.settled && hasBids && (
              <p className="mt-2 text-sm text-neutral-400">
                Settled. The seller can collect the winning bid from the banner at the top. Item delivery is arranged
                between seller and winner.
              </p>
            )}
          </div>
        )}

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
              className="rounded-lg border border-red-700 px-4 py-2 text-red-300 hover:bg-red-950 disabled:opacity-50"
            >
              {cancelTx.status === "wallet"
                ? "Waiting for wallet…"
                : cancelTx.status === "confirming"
                  ? "Confirming…"
                  : "Cancel auction"}
            </button>
            {cancelTx.error && <p className="mt-2 text-sm text-red-400">{cancelTx.error}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:col-span-2">
        {!auction.settled && !auction.cancelled && <BidBox auctionId={auctionId} auction={auction} ended={ended} />}
        <BidFeed
          auctionId={auctionId}
          createdBlock={auction.createdBlock}
          bidCount={auction.bidCount}
          payInUsdc={auction.payInUsdc}
          onNewEvent={() => void refetch()}
          onExtended={() => setExtendedAt(Date.now())}
        />
      </div>
    </div>
  );
}

/** Small label/value box. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{children}</dd>
    </div>
  );
}
