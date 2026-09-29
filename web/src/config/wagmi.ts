import { createConfig, http, injected } from "wagmi";
import { appChain } from "./chains";

/** wagmi config: one Monad chain, browser (injected) wallets only. */
export const wagmiConfig = createConfig({
  chains: [appChain],
  connectors: [injected()],
  transports: {
    [appChain.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
