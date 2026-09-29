import { currencySymbol } from "@/lib/format";

/** MON / USDC pill. MON is Monad purple with a diamond, USDC is dollar blue with a "$". */
export function CurrencyBadge({ payInUsdc, size = "sm" }: { payInUsdc: boolean; size?: "sm" | "md" }) {
  const sizing = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold tracking-wide ring-1 ring-inset ${sizing} ${
        payInUsdc ? "bg-[#0e2347] text-usdc-soft ring-usdc/70" : "bg-[#241a52] text-grape-soft ring-grape/70"
      }`}
      title={payInUsdc ? "Paid in USDC (digital dollars)" : "Paid in MON (Monad's native coin)"}
    >
      <span
        aria-hidden
        className={`grid h-4 w-4 place-items-center rounded-full text-[10px] leading-none text-white ${
          payInUsdc ? "bg-usdc" : "bg-grape"
        }`}
      >
        {payInUsdc ? "$" : "◆"}
      </span>
      {currencySymbol(payInUsdc)}
    </span>
  );
}
