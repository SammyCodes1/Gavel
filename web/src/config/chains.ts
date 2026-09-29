import { defineChain } from "viem";

// Monad network settings. All values come from the official docs:
// https://docs.monad.xyz/developer-essentials/testnet
// To add mainnet later, define it here and change `appChain`.

/** Monad Testnet (chain ID 10143). */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
      webSocket: ["wss://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
  contracts: {
    // Canonical Multicall3 listed on the testnet network page; used for batched reads.
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: true,
});

/** The chain the app runs on. */
export const appChain = monadTestnet;

/**
 * Max block range per eth_getLogs call. The docs' RPC limits table
 * (https://docs.monad.xyz/reference/json-rpc/overview#eth_getlogs) lists 100 blocks for the
 * QuickNode and Monad Foundation public RPCs (mainnet rows). The testnet public RPC
 * (https://testnet-rpc.monad.xyz) also answered "eth_getLogs is limited to a 100 range" when
 * tested, so we fetch history in chunks of 100 blocks.
 */
export const GET_LOGS_BLOCK_RANGE = BigInt(100);

/** Explorer link for an address. */
export function explorerAddressUrl(address: string): string {
  return `${appChain.blockExplorers.default.url}/address/${address}`;
}

/** Explorer link for a transaction. */
export function explorerTxUrl(hash: string): string {
  return `${appChain.blockExplorers.default.url}/tx/${hash}`;
}
