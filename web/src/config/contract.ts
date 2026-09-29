import { isAddress, type Address } from "viem";
import { appChain } from "./chains";

export { gavelAbi } from "./gavelAbi";

/**
 * Gavel contract address. It is read from NEXT_PUBLIC_GAVEL_ADDRESS (see web/.env.example)
 * because the contract has not been deployed yet. After deploying, set that variable locally
 * and on Vercel (or hardcode the address here).
 */
const rawGavelAddress = process.env.NEXT_PUBLIC_GAVEL_ADDRESS ?? "";

/** The Gavel address, or undefined when it is not configured (or not a valid address). */
export const GAVEL_ADDRESS: Address | undefined = isAddress(rawGavelAddress) ? rawGavelAddress : undefined;

/** Chain the Gavel contract is deployed on. */
export const GAVEL_CHAIN_ID = appChain.id;

/** Official Circle USDC addresses (6 decimals), from https://developers.circle.com/stablecoins/usdc-contract-addresses */
export const USDC_ADDRESSES: Record<number, Address> = {
  143: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", // Monad mainnet
  10143: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // Monad testnet
};

/** USDC address for the chain the app runs on. */
export const USDC_ADDRESS: Address = USDC_ADDRESSES[appChain.id];

export const MON_DECIMALS = 18;
export const USDC_DECIMALS = 6;

// Same limits as the contract.
export const MAX_TITLE_LENGTH = 100; // bytes
export const MAX_IMAGE_URL_LENGTH = 300; // bytes
export const EXTENSION_TIME_SECONDS = 120;
