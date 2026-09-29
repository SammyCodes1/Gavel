"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { appChain } from "@/config/chains";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, USDC_ADDRESS, gavelAbi } from "@/config/contract";
import type { Auction } from "@/lib/types";
import { currencyDecimals, currencySymbol, formatAmount } from "@/lib/format";
import { useTx } from "@/lib/useTx";

/** Parse the typed bid. Returns undefined if it is not a valid positive amount. */
function parseBid(text: string, decimals: number): bigint | undefined {
  const t = text.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  if ((t.split(".")[1] ?? "").length > decimals) return undefined;
  const v = parseUnits(t, decimals);
  return v > BigInt(0) ? v : undefined;
}

/** Bid input and buttons. MON: one step. USDC: approve exact amount, then bid. */
export function BidBox({ auctionId, auction, ended }: { auctionId: bigint; auction: Auction; ended: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const decimals = currencyDecimals(auction.payInUsdc);
  const symbol = currencySymbol(auction.payInUsdc);
  const minNext = auction.bidCount === 0 ? auction.startPrice : auction.highestBid + auction.minIncrement;

  // Prefill with the minimum valid next bid (and update it when someone bids).
  const [input, setInput] = useState(formatUnits(minNext, decimals));
  useEffect(() => {
    setInput(formatUnits(minNext, decimals));
  }, [minNext, decimals]);

  const approveTx = useTx();
  const bidTx = useTx();

  // USDC balance and allowance for the Gavel contract.
  const usdcReads = useReadContracts({
    contracts: [
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address!], chainId: GAVEL_CHAIN_ID },
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address!, GAVEL_ADDRESS!],
        chainId: GAVEL_CHAIN_ID,
      },
    ],
    query: { enabled: auction.payInUsdc && Boolean(address && GAVEL_ADDRESS), refetchInterval: 10_000 },
  });
  const usdcBalance = usdcReads.data?.[0].status === "success" ? usdcReads.data[0].result : undefined;
  const allowance = usdcReads.data?.[1].status === "success" ? usdcReads.data[1].result : undefined;

  const amount = parseBid(input, decimals);
  const isSeller = address?.toLowerCase() === auction.seller.toLowerCase();
  const wrongNetwork = isConnected && chainId !== appChain.id;

  let blocker = "";
  if (!isConnected) blocker = "Connect your wallet to bid";
  else if (wrongNetwork) blocker = "Switch your wallet to Monad to bid";
  else if (isSeller) blocker = "You can't bid on your own auction";
  else if (ended) blocker = "Auction has ended";
  else if (amount === undefined) blocker = `Enter a valid amount in ${symbol}`;
  else if (amount < minNext) blocker = "Your bid is too low";
  else if (auction.payInUsdc && usdcBalance !== undefined && usdcBalance < amount) blocker = "Not enough USDC";

  const needsApproval = auction.payInUsdc && amount !== undefined && (allowance === undefined || allowance < amount);
  const busy = approveTx.busy || bidTx.busy;
  const disabled = Boolean(blocker) || busy || (auction.payInUsdc && allowance === undefined && isConnected);

  /** Approve exactly `amount` USDC for the Gavel contract (never unlimited). */
  async function approve() {
    if (!amount) return;
    await approveTx.send(() =>
      approveTx.write({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [GAVEL_ADDRESS!, amount],
        chainId: GAVEL_CHAIN_ID,
      }),
    );
    await usdcReads.refetch();
  }

  /** Place the bid. MON sends value = amount; USDC sends value 0. */
  async function placeBid() {
    if (!amount) return;
    await bidTx.send(() =>
      bidTx.write({
        address: GAVEL_ADDRESS!,
        abi: gavelAbi,
        functionName: "bid",
        args: [auctionId, amount],
        value: auction.payInUsdc ? BigInt(0) : amount,
        chainId: GAVEL_CHAIN_ID,
      }),
    );
    await usdcReads.refetch();
  }

  const label = (status: string, idle: string) =>
    status === "wallet" ? "Waiting for wallet…" : status === "confirming" ? "Confirming…" : idle;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Place a bid</h2>
      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Your bid ({symbol}) · minimum {formatAmount(minNext, auction.payInUsdc)}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-lg text-neutral-100 outline-none focus:border-violet-500"
        />
      </label>

      {auction.payInUsdc && usdcBalance !== undefined && (
        <p className="mt-2 text-xs text-neutral-500">Your USDC balance: {formatAmount(usdcBalance, true)}</p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {auction.payInUsdc && needsApproval ? (
          <>
            <p className="text-sm text-neutral-400">Step 1 of 2: Approve</p>
            <button onClick={approve} disabled={disabled} className={buttonClass}>
              {label(approveTx.status, "Approve USDC")}
            </button>
          </>
        ) : (
          <>
            {auction.payInUsdc && <p className="text-sm text-neutral-400">Step 2 of 2: Bid</p>}
            <button onClick={placeBid} disabled={disabled} className={buttonClass}>
              {label(bidTx.status, "Place bid")}
            </button>
          </>
        )}
      </div>

      {blocker && <p className="mt-2 text-sm text-amber-400">{blocker}</p>}
      {approveTx.error && <p className="mt-2 text-sm text-red-400">{approveTx.error}</p>}
      {bidTx.error && <p className="mt-2 text-sm text-red-400">{bidTx.error}</p>}
      {bidTx.status === "success" && <p className="mt-2 text-sm text-green-400">Bid placed!</p>}
    </div>
  );
}

const buttonClass =
  "rounded-lg bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50";
