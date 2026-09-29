import { formatUnits } from "viem";
import { MON_DECIMALS, USDC_DECIMALS } from "@/config/contract";

/** Currency symbol for an auction. */
export function currencySymbol(payInUsdc: boolean): "MON" | "USDC" {
  return payInUsdc ? "USDC" : "MON";
}

/** Decimals for an auction's currency: 6 for USDC, 18 for MON. */
export function currencyDecimals(payInUsdc: boolean): number {
  return payInUsdc ? USDC_DECIMALS : MON_DECIMALS;
}

/** Format a raw amount in the auction's currency, e.g. "1.5 MON". */
export function formatAmount(amount: bigint, payInUsdc: boolean): string {
  return `${formatUnits(amount, currencyDecimals(payInUsdc))} ${currencySymbol(payInUsdc)}`;
}

/** Shorten an address to 0x1234…abcd. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Turn a number of seconds into "2d 3h 4m 5s" style text. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

/** Only allow images served over https. Anything else is not rendered. */
export function safeImageUrl(url: string): string | undefined {
  return url.startsWith("https://") ? url : undefined;
}

/** UTF-8 byte length, which is what the contract checks. */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Scoreboard-style clock for countdowns: "04:07" under an hour, "3:04:07" under a day,
 * and "2d 03:04" beyond that.
 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}
