"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { explorerAddressUrl } from "@/config/chains";
import { addTimestamps, loadBidLogs, mergeRows, type BidRow } from "@/lib/bidHistory";
import { formatAmount, shortAddress } from "@/lib/format";
import { LiveDot } from "./StatusBadge";

/**
 * Live bid feed: loads past BidPlaced events (createdBlock -> latest, in getLogs chunks),
 * then adds new BidPlaced / AuctionExtended events live with useWatchContractEvent.
 */
export function BidFeed(props: {
  auctionId: bigint;
  createdBlock: bigint;
  bidCount: number;
  payInUsdc: boolean;
  onNewEvent: () => void; // refetch the auction
  onExtended: () => void; // show the "Extended by 2 minutes" notice
  live?: boolean; // visual only: show the LIVE pill while bidding is open
}) {
  const { auctionId, createdBlock, bidCount, payInUsdc, onNewEvent, onExtended } = props;
  const client = usePublicClient({ chainId: GAVEL_CHAIN_ID });
  const [rows, setRows] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [watchKey, setWatchKey] = useState(0);
  const scannedTo = useRef<bigint | undefined>(undefined); // last block included in history
  const syncing = useRef(false);

  // Initial history load. Only needs to find `bidCount` bids, newest first.
  const initialBidCount = useRef(bidCount);
  useEffect(() => {
    if (!client || !GAVEL_ADDRESS) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const latest = await client.getBlockNumber();
        const found =
          initialBidCount.current === 0
            ? []
            : await loadBidLogs({
                client,
                address: GAVEL_ADDRESS!,
                auctionId,
                fromBlock: createdBlock,
                toBlock: latest,
                stopAfter: initialBidCount.current,
                onProgress: (f) => !cancelled && setProgress(f),
                isCancelled: () => cancelled,
              });
        if (cancelled) return;
        scannedTo.current = latest;
        const withTimes = await addTimestamps(client, found);
        if (!cancelled) setRows((prev) => mergeRows(prev, withTimes));
      } catch {
        if (!cancelled) setError("Could not load bid history. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, auctionId, createdBlock]);

  // Catch up on any blocks since the last scan (used if the live watcher misses something).
  const catchUp = useCallback(async () => {
    if (!client || !GAVEL_ADDRESS || scannedTo.current === undefined || syncing.current) return;
    syncing.current = true;
    try {
      const latest = await client.getBlockNumber();
      const found = await loadBidLogs({
        client,
        address: GAVEL_ADDRESS,
        auctionId,
        fromBlock: scannedTo.current + BigInt(1),
        toBlock: latest,
      });
      scannedTo.current = latest;
      const withTimes = await addTimestamps(client, found);
      setRows((prev) => mergeRows(prev, withTimes));
    } catch {
      // Try again on the next auction refetch.
    } finally {
      syncing.current = false;
    }
  }, [client, auctionId]);

  // If the contract says there are more bids than we show, catch up.
  useEffect(() => {
    if (!loading && bidCount > rows.length) void catchUp();
  }, [bidCount, rows.length, loading, catchUp]);

  // Live updates.
  const handleLiveBids = useCallback(
    async (newRows: BidRow[]) => {
      if (!client) return;
      setRows((prev) => mergeRows(prev, newRows));
      const withTimes = await addTimestamps(client, newRows).catch(() => newRows);
      setRows((prev) => mergeRows(prev, withTimes));
    },
    [client],
  );

  return (
    <section className="rounded-3xl border border-line bg-panel p-5" aria-label={props.live === false ? "Bid history" : "Live bids"}>
      <LiveWatcher
        key={watchKey}
        auctionId={auctionId}
        onBids={(r) => {
          void handleLiveBids(r);
          onNewEvent();
        }}
        onExtended={() => {
          onExtended();
          onNewEvent();
        }}
        onError={() => {
          // e.g. the tab slept and the block range grew too large: catch up and restart the watcher.
          void catchUp().then(() => setWatchKey((k) => k + 1));
        }}
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold">{props.live === false ? "Bid history" : "Live bids"}</h2>
        {props.live !== false && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-hot/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-hot-soft">
            <LiveDot /> Live
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-hot-soft">
          {error}
        </p>
      )}
      {loading && (
        <div className="py-2">
          <p className="text-sm text-muted">Loading bid history… {Math.round(progress * 100)}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden>
            <div className="h-full rounded-full bg-grape transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}
      {!loading && rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">
          No bids yet. Be the first!
        </p>
      )}
      <ul className="-mx-2 flex max-h-[26rem] flex-col gap-1 overflow-y-auto px-2" aria-live="polite" aria-label="Bid history, newest first">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm motion-safe:animate-bid-in ${
              i === 0 ? "bg-lime/10 ring-1 ring-inset ring-lime/50" : "bg-panel-2/60"
            }`}
          >
            <span
              aria-hidden
              className="h-8 w-8 shrink-0 rounded-full ring-2 ring-ink"
              style={{ background: avatarGradient(r.bidder) }}
            />
            <div className="min-w-0 flex-1">
              <a
                href={explorerAddressUrl(r.bidder)}
                target="_blank"
                rel="noreferrer"
                className="rounded font-mono text-sm font-semibold text-fg hover:text-grape-soft"
              >
                {shortAddress(r.bidder)}
              </a>
              <div className="text-xs text-dim">
                {r.timestamp ? new Date(r.timestamp * 1000).toLocaleTimeString() : "…"}
              </div>
            </div>
            <div className="text-right">
              {i === 0 && (
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-lime">
                  {props.live === false ? "Winning bid" : "Top bid"}
                </div>
              )}
              <span className={`tabular font-mono ${i === 0 ? "text-base font-extrabold text-lime" : "font-semibold text-muted"}`}>
                {formatAmount(r.amount, payInUsdc)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A colourful, stable avatar for an address (two hues picked from its hex). */
function avatarGradient(address: string): string {
  const a = parseInt(address.slice(2, 6), 16) % 360;
  const b = parseInt(address.slice(-4), 16) % 360;
  return `linear-gradient(135deg, hsl(${a} 90% 60%), hsl(${b} 90% 50%))`;
}

/** Watches all Gavel events and passes on BidPlaced / AuctionExtended for this auction. */
function LiveWatcher(props: {
  auctionId: bigint;
  onBids: (rows: BidRow[]) => void;
  onExtended: () => void;
  onError: () => void;
}) {
  useWatchContractEvent({
    address: GAVEL_ADDRESS,
    abi: gavelAbi,
    chainId: GAVEL_CHAIN_ID,
    pollingInterval: 1_000,
    enabled: Boolean(GAVEL_ADDRESS),
    onLogs(logs) {
      const bids: BidRow[] = [];
      let extended = false;
      for (const log of logs) {
        if (log.eventName === "BidPlaced" && log.args.auctionId === props.auctionId) {
          bids.push({
            key: `${log.transactionHash}:${log.logIndex}`,
            bidder: log.args.bidder!,
            amount: log.args.amount!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            txHash: log.transactionHash,
          });
        }
        if (log.eventName === "AuctionExtended" && log.args.auctionId === props.auctionId) extended = true;
      }
      if (bids.length > 0) props.onBids(bids);
      if (extended) props.onExtended();
    },
    onError() {
      props.onError();
    },
  });
  return null;
}
