"use client";

import { useAccount, useReadContracts } from "wagmi";
import { GAVEL_ADDRESS, GAVEL_CHAIN_ID, gavelAbi } from "@/config/contract";
import { appChain } from "@/config/chains";
import { formatAmount } from "@/lib/format";
import { useTx } from "@/lib/useTx";

/** Shows "You have X MON/USDC to collect" with withdraw buttons when the wallet is owed funds. */
export function WithdrawBanner() {
  const { address, chainId } = useAccount();
  const enabled = Boolean(address && GAVEL_ADDRESS);

  const { data } = useReadContracts({
    contracts: [
      { address: GAVEL_ADDRESS, abi: gavelAbi, functionName: "pendingMon", args: [address!], chainId: GAVEL_CHAIN_ID },
      { address: GAVEL_ADDRESS, abi: gavelAbi, functionName: "pendingUsdc", args: [address!], chainId: GAVEL_CHAIN_ID },
    ],
    query: { enabled, refetchInterval: 10_000 },
  });

  const monTx = useTx();
  const usdcTx = useTx();

  if (!enabled || !data) return null;
  const pendingMon = data[0].status === "success" ? data[0].result : BigInt(0);
  const pendingUsdc = data[1].status === "success" ? data[1].result : BigInt(0);
  if (pendingMon === BigInt(0) && pendingUsdc === BigInt(0)) return null;

  const wrongNetwork = chainId !== appChain.id;

  return (
    <div className="border-t border-violet-900 bg-violet-950/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3">
        {pendingMon > BigInt(0) && (
          <Row
            text={`You have ${formatAmount(pendingMon, false)} to collect`}
            label="Withdraw MON"
            busy={monTx.busy}
            disabled={wrongNetwork}
            error={monTx.error}
            onClick={() =>
              monTx.send(() =>
                monTx.write({
                  address: GAVEL_ADDRESS!,
                  abi: gavelAbi,
                  functionName: "withdrawMon",
                  chainId: GAVEL_CHAIN_ID,
                }),
              )
            }
          />
        )}
        {pendingUsdc > BigInt(0) && (
          <Row
            text={`You have ${formatAmount(pendingUsdc, true)} to collect`}
            label="Withdraw USDC"
            busy={usdcTx.busy}
            disabled={wrongNetwork}
            error={usdcTx.error}
            onClick={() =>
              usdcTx.send(() =>
                usdcTx.write({
                  address: GAVEL_ADDRESS!,
                  abi: gavelAbi,
                  functionName: "withdrawUsdc",
                  chainId: GAVEL_CHAIN_ID,
                }),
              )
            }
          />
        )}
      </div>
    </div>
  );
}

/** One line of the banner: message, button, and error. */
function Row(props: {
  text: string;
  label: string;
  busy: boolean;
  disabled: boolean;
  error: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>{props.text}</span>
      <button
        onClick={props.onClick}
        disabled={props.busy || props.disabled}
        className="rounded-lg bg-violet-500 px-3 py-1.5 font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
      >
        {props.busy ? "Collecting…" : props.label}
      </button>
      {props.error && <span className="text-red-400">{props.error}</span>}
    </div>
  );
}
