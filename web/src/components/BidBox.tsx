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

  // Quick picks only fill in the input; the same checks as typing apply.
  const quickPicks = [
    { label: "Minimum", value: minNext },
    { label: "+1 step", value: minNext + auction.minIncrement },
    { label: "+5 steps", value: minNext + auction.minIncrement * BigInt(5) },
  ];
  const usdcStep = needsApproval ? 1 : 2;

  return (
    <section className="rounded-3xl border border-line bg-panel p-5" aria-labelledby="bid-heading">
      <h2 id="bid-heading" className="font-display text-2xl font-extrabold">
        Place your bid
      </h2>
      <label htmlFor="bid-amount" className="mt-3 block text-sm font-semibold text-muted">
        Your bid ({symbol}) · minimum <span className="text-fg">{formatAmount(minNext, auction.payInUsdc)}</span>
      </label>
      <div className="mt-2 flex items-center rounded-2xl border-2 border-line bg-ink px-4 transition focus-within:border-lime">
        <input
          id="bid-amount"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="tabular min-w-0 flex-1 bg-transparent py-3 font-display text-3xl font-extrabold text-fg outline-none focus-visible:outline-none"
        />
        <span className="shrink-0 pl-2 text-lg font-extrabold text-muted">{symbol}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick bid amounts">
        {quickPicks.map((q) => {
          const text = formatUnits(q.value, decimals);
          const selected = input.trim() === text;
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => setInput(text)}
              aria-pressed={selected}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selected ? "border-lime bg-lime/15 text-lime" : "border-line text-muted hover:border-grape hover:text-fg"
              }`}
            >
              {q.label} · {text}
            </button>
          );
        })}
      </div>

      {auction.payInUsdc && usdcBalance !== undefined && (
        <p className="mt-3 text-xs text-dim">Your USDC balance: {formatAmount(usdcBalance, true)}</p>
      )}

      {auction.payInUsdc && (
        <ol className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold" aria-label="USDC bids take two steps">
          {["Approve USDC", "Place bid"].map((step, i) => (
            <li
              key={step}
              aria-current={usdcStep === i + 1 ? "step" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                usdcStep === i + 1 ? "bg-usdc/20 text-usdc-soft ring-1 ring-usdc/60" : "bg-panel-2 text-dim"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                  usdcStep === i + 1 ? "bg-usdc text-white" : usdcStep > i + 1 ? "bg-lime text-ink" : "bg-line text-muted"
                }`}
              >
                {usdcStep > i + 1 ? "✓" : i + 1}
              </span>
              Step {i + 1} of 2: {step}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {auction.payInUsdc && needsApproval ? (
          <button onClick={approve} disabled={disabled} className={buttonClass}>
            {label(approveTx.status, "Approve USDC")}
          </button>
        ) : (
          <button onClick={placeBid} disabled={disabled} className={buttonClass}>
            {label(bidTx.status, "Place bid")}
          </button>
        )}
      </div>

      <div aria-live="polite">
        {blocker && (
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-sun">
            <span aria-hidden>●</span>
            {blocker}
          </p>
        )}
        {approveTx.error && (
          <p role="alert" className="mt-2 text-sm text-hot-soft">
            {approveTx.error}
          </p>
        )}
        {bidTx.error && (
          <p role="alert" className="mt-2 text-sm text-hot-soft">
            {bidTx.error}
          </p>
        )}
        {bidTx.status === "success" && (
          <p className="mt-3 rounded-xl bg-lime px-3 py-2 text-sm font-extrabold text-ink motion-safe:animate-pop">
            🎉 Bid placed! Watch the feed below.
          </p>
        )}
      </div>
    </section>
  );
}

const buttonClass =
  "w-full rounded-2xl bg-lime px-5 py-4 font-display text-xl font-extrabold text-ink shadow-[0_12px_32px_-12px] shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-deep active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-dim disabled:shadow-none";
