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
          className="min-h-11 whitespace-nowrap rounded-xl bg-fg px-3 text-sm font-bold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error && (
          <span
            role="alert"
            className="absolute right-0 top-full z-40 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-hot/50 bg-panel p-2 text-xs text-hot-soft shadow-xl"
          >
            {friendlyConnectError(error)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {chainId !== appChain.id && (
        <button
          onClick={() => switchChain({ chainId: appChain.id })}
          disabled={isSwitching}
          className="min-h-11 whitespace-nowrap rounded-xl bg-sun px-3 text-sm font-bold text-ink disabled:opacity-50"
        >
          {isSwitching ? "Switching…" : "Switch to Monad"}
        </button>
      )}
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        aria-label={`Disconnect wallet ${shortAddress(address)}`}
        className={`group min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-panel px-3 font-mono text-xs transition hover:border-hot sm:text-sm ${
          // On phones the "Switch to Monad" button takes this spot; disconnect is back once switched.
          chainId !== appChain.id ? "hidden sm:inline-flex" : "inline-flex"
        }`}
      >
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-lime" />
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
