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
  return (
    <span className={`tabular inline-flex items-baseline gap-[0.25em] ${className}`}>
      <span className="break-all">{formatUnits(amount, currencyDecimals(payInUsdc))}</span>
      <span className={symbolClassName}>{currencySymbol(payInUsdc)}</span>
    </span>
  );
}
