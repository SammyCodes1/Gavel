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
      <div className="relative flex flex-col items-end">
        <button
          onClick={() => connector && connect({ connector })}
          disabled={isPending || !connector}
          className="rounded-xl bg-fg px-3 py-2 text-sm font-bold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error && (
          <span
            role="alert"
            className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-hot/50 bg-panel p-2 text-xs text-hot-soft shadow-xl"
          >
            {friendlyConnectError(error)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {chainId !== appChain.id && (
        <button
          onClick={() => switchChain({ chainId: appChain.id })}
          disabled={isSwitching}
          className="rounded-xl bg-sun px-3 py-2 text-sm font-bold text-ink disabled:opacity-50"
        >
          {isSwitching ? "Switching…" : "Switch to Monad"}
        </button>
      )}
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        aria-label={`Disconnect wallet ${shortAddress(address)}`}
        className="group inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 font-mono text-sm transition hover:border-hot"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-lime" />
        {shortAddress(address)}
        <span className="hidden font-sans text-xs text-dim group-hover:text-hot-soft sm:inline">Disconnect</span>
      </button>
    </div>
  );
}

/** Explain the most common connect failure (no browser wallet installed). */
function friendlyConnectError(error: Error): string {
  if (error.name === "ProviderNotFoundError") return "No browser wallet found. Install MetaMask or similar.";
  return friendlyError(error);
}
