import { currencySymbol } from "@/lib/format";

/** Small MON / USDC label. */
export function CurrencyBadge({ payInUsdc }: { payInUsdc: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        payInUsdc ? "bg-sky-900 text-sky-200" : "bg-violet-900 text-violet-200"
      }`}
    >
      {currencySymbol(payInUsdc)}
    </span>
  );
}
