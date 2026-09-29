"use client";

import { useReadContract } from "wagmi";
import { explorerAddressUrl } from "@/config/chains";
import { EXTENSION_TIME_SECONDS, GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { LiveDot } from "@/components/StatusBadge";

/** Strip of facts. The auction count is read live from the Gavel contract (same read as /auctions). */
export function LiveStats() {
  const count = useReadContract({
    address: GAVEL_ADDRESS,
    abi: gavelAbi,
    functionName: "auctionCount",
    chainId: GAVEL_CHAIN_ID,
    query: { enabled: Boolean(GAVEL_ADDRESS), refetchInterval: 15_000 },
  });
  const total = count.data === undefined ? undefined : Number(count.data);

  const stats = [
    {
      value: total === undefined ? (count.isError ? "—" : "…") : total.toLocaleString("en-US"),
      label: total === 0 ? "auctions so far. Yours could be first" : "auctions created so far",
      live: true,
    },
    { value: `${EXTENSION_TIME_SECONDS / 60}:00`, label: "left on the clock after any bid in the final 2 minutes" },
    { value: "~1s", label: "for a bid to land on Monad" },
    { value: "2", label: "ways to pay: MON or USDC" },
  ];

  return (
    <section aria-label="Gavel in numbers" className="rounded-3xl border border-line bg-panel/80 p-2">
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col-reverse rounded-2xl bg-ink/50 p-4">
            <dt className="mt-1 text-sm text-muted">{s.label}</dt>
            <dd className="flex items-center gap-2 font-mono text-3xl font-extrabold text-fg sm:text-4xl">
              {s.live && <LiveDot className="bg-lime" />}
              <span className="tabular min-w-0 [overflow-wrap:anywhere]">{s.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      {GAVEL_ADDRESS && (
        <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 pb-1 pt-3 text-xs text-dim">
          <span>The first number is read live from the Gavel contract on Monad testnet.</span>
          <a
            href={explorerAddressUrl(GAVEL_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-bold text-grape-soft hover:underline"
          >
            View contract on explorer ↗
          </a>
        </p>
      )}
    </section>
  );
}
