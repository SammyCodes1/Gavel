import type { ContractFunctionReturnType } from "viem";
import type { gavelAbi } from "@/config/gavelAbi";

/** The Auction struct as returned by getAuction. */
export type Auction = ContractFunctionReturnType<typeof gavelAbi, "view", "getAuction">;

/** Live = not settled, not cancelled, and endTime still in the future. */
export function isLive(a: Auction, nowSeconds: number): boolean {
  return !a.settled && !a.cancelled && Number(a.endTime) > nowSeconds;
}
