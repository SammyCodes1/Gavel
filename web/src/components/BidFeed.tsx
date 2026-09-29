"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { explorerAddressUrl } from "@/config/chains";
import { addTimestamps, loadBidLogs, mergeRows, type BidRow } from "@/lib/bidHistory";
import { formatAmount, shortAddress } from "@/lib/format";

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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
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
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        Bids <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" title="Live" />
      </h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-neutral-400">Loading bid history… {Math.round(progress * 100)}%</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-neutral-500">No bids yet. Be the first!</p>}
      <ul className="flex flex-col divide-y divide-neutral-800">
        {rows.map((r, i) => (
          <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <a
              href={explorerAddressUrl(r.bidder)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-neutral-300 hover:text-violet-400"
            >
              {shortAddress(r.bidder)}
            </a>
            <span className={i === 0 ? "font-bold text-violet-300" : "text-neutral-200"}>
              {formatAmount(r.amount, payInUsdc)}
            </span>
            <span className="text-xs text-neutral-500">
              {r.timestamp ? new Date(r.timestamp * 1000).toLocaleTimeString() : "…"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
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
