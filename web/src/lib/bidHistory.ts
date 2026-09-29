import { getAbiItem, type Hash, type PublicClient } from "viem";
import { gavelAbi } from "@/config/gavelAbi";
import { GET_LOGS_BLOCK_RANGE as CHUNK } from "@/config/chains";

/** One row in the bid feed. */
export type BidRow = {
  key: string; // txHash:logIndex, used to de-duplicate
  bidder: `0x${string}`;
  amount: bigint;
  blockNumber: bigint;
  logIndex: number;
  txHash: Hash;
  timestamp?: number; // seconds, filled in from the block
};

const bidPlacedEvent = getAbiItem({ abi: gavelAbi, name: "BidPlaced" });

// Number of getLogs requests sent at the same time. Keeps us well under the public
// RPC rate limit (50 requests/second on testnet-rpc.monad.xyz per the docs).
const CONCURRENCY = 5;

/**
 * Load BidPlaced events for one auction between fromBlock and toBlock (inclusive).
 * The Monad RPC limits eth_getLogs to a small block range, so the range is split into
 * chunks of CHUNK (100) blocks. Chunks are scanned newest first, and scanning stops
 * early once `stopAfter` bids have been found (we know bidCount from the contract).
 */
export async function loadBidLogs(opts: {
  client: PublicClient;
  address: `0x${string}`;
  auctionId: bigint;
  fromBlock: bigint;
  toBlock: bigint;
  stopAfter?: number;
  onProgress?: (fraction: number) => void;
  isCancelled?: () => boolean;
}): Promise<BidRow[]> {
  const { client, address, auctionId, fromBlock, toBlock, stopAfter, onProgress, isCancelled } = opts;
  if (toBlock < fromBlock) return [];

  // Build [from, to] chunks, newest first.
  const chunks: [bigint, bigint][] = [];
  for (let end = toBlock; end >= fromBlock; end -= CHUNK) {
    const start = end - CHUNK + BigInt(1) > fromBlock ? end - CHUNK + BigInt(1) : fromBlock;
    chunks.push([start, end]);
    if (start === fromBlock) break;
  }

  const rows: BidRow[] = [];
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    if (isCancelled?.()) return rows;
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(([start, end]) =>
        client.getLogs({ address, event: bidPlacedEvent, args: { auctionId }, fromBlock: start, toBlock: end }),
      ),
    );
    for (const logs of results) {
      for (const log of logs) {
        rows.push({
          key: `${log.transactionHash}:${log.logIndex}`,
          bidder: log.args.bidder!,
          amount: log.args.amount!,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          txHash: log.transactionHash,
        });
      }
    }
    onProgress?.(Math.min(1, (i + batch.length) / chunks.length));
    if (stopAfter !== undefined && rows.length >= stopAfter) break;
  }
  return rows;
}

const blockTimeCache = new Map<bigint, number>();

/** Fill in each row's timestamp from its block (cached). */
export async function addTimestamps(client: PublicClient, rows: BidRow[]): Promise<BidRow[]> {
  const missing = [...new Set(rows.map((r) => r.blockNumber))].filter((b) => !blockTimeCache.has(b));
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    const blocks = await Promise.all(batch.map((blockNumber) => client.getBlock({ blockNumber })));
    blocks.forEach((b) => blockTimeCache.set(b.number, Number(b.timestamp)));
  }
  return rows.map((r) => ({ ...r, timestamp: r.timestamp ?? blockTimeCache.get(r.blockNumber) }));
}

/** Merge rows, drop duplicates, newest first. */
export function mergeRows(a: BidRow[], b: BidRow[]): BidRow[] {
  const map = new Map<string, BidRow>();
  for (const r of [...a, ...b]) {
    const existing = map.get(r.key);
    map.set(r.key, { ...r, timestamp: r.timestamp ?? existing?.timestamp });
  }
  return [...map.values()].sort((x, y) =>
    x.blockNumber === y.blockNumber ? y.logIndex - x.logIndex : x.blockNumber < y.blockNumber ? 1 : -1,
  );
}
