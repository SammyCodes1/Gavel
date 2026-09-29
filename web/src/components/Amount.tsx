import { formatUnits } from "viem";
import { currencyDecimals, currencySymbol } from "@/lib/format";

/** A money amount with a big number and a smaller currency symbol, e.g. "1.5 MON". */
export function Amount({
  amount,
  payInUsdc,
  className = "",
  symbolClassName = "text-[0.5em] font-bold text-muted",
}: {
  amount: bigint;
  payInUsdc: boolean;
  className?: string;
  symbolClassName?: string;
}) {
  const text = formatUnits(amount, currencyDecimals(payInUsdc));
  // Very long numbers (e.g. 18-decimal MON amounts) shrink instead of pushing the layout wide.
  const scale = text.length > 20 ? "0.5em" : text.length > 14 ? "0.62em" : text.length > 10 ? "0.8em" : undefined;
  return (
    <span className={`tabular inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-[0.25em] ${className}`}>
      <span className="min-w-0 break-all" style={scale ? { fontSize: scale } : undefined}>
        {text}
      </span>
      <span className={symbolClassName}>{currencySymbol(payInUsdc)}</span>
    </span>
  );
}
