"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { appChain } from "@/config/chains";
import { friendlyError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";

/** Connect / Disconnect button with the short address, plus "Switch to Monad" on the wrong network. */
export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (!isConnected || !address) {
    const connector = connectors[0];
    return (
      <div className="flex flex-col items-end">
        <button
          onClick={() => connector && connect({ connector })}
          disabled={isPending || !connector}
          className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error && <span className="mt-1 text-xs text-red-400">{friendlyConnectError(error)}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chainId !== appChain.id && (
        <button
          onClick={() => switchChain({ chainId: appChain.id })}
          disabled={isSwitching}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {isSwitching ? "Switching…" : "Switch to Monad"}
        </button>
      )}
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        className="rounded-lg border border-neutral-700 px-3 py-2 font-mono text-sm hover:border-violet-400"
      >
        {shortAddress(address)} · Disconnect
      </button>
    </div>
  );
}

/** Explain the most common connect failure (no browser wallet installed). */
function friendlyConnectError(error: Error): string {
  if (error.name === "ProviderNotFoundError") return "No browser wallet found. Install MetaMask or similar.";
  return friendlyError(error);
}
