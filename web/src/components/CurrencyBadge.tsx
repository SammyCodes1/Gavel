import { currencySymbol } from "@/lib/format";

// Official token logos, self-hosted (CSP img-src 'self'), unmodified from the brand kits:
// - /logos/monad.svg: Monad "Token" mark, https://www.monad.xyz/brand-page-assets/Token.svg
// - /logos/usdc.svg: Circle "USDC Token" logo, from the USDC logo pack linked on https://www.circle.com/pressroom
const LOGO = { MON: "/logos/monad.svg", USDC: "/logos/usdc.svg" } as const;

const SIZES = {
  sm: { pill: "gap-1.5 py-0.5 pl-1 pr-2.5 text-xs", icon: 18 },
  md: { pill: "gap-2 py-1 pl-1 pr-3 text-sm", icon: 22 },
  lg: { pill: "gap-2.5 py-1 pl-1 pr-3.5 text-base", icon: 32 },
} as const;

/** MON / USDC pill with the official token logo. */
export function CurrencyBadge({ payInUsdc, size = "sm" }: { payInUsdc: boolean; size?: keyof typeof SIZES }) {
  const symbol = currencySymbol(payInUsdc);
  const s = SIZES[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold tracking-wide ring-1 ring-inset ${s.pill} ${
        payInUsdc ? "bg-[#0e2347] text-usdc-soft ring-usdc/70" : "bg-[#241a52] text-grape-soft ring-grape/70"
      }`}
      title={payInUsdc ? "Paid in USDC (digital dollars)" : "Paid in MON (Monad's native coin)"}
    >
      {/* Local static SVG; next/image would need dangerouslyAllowSVG, so a plain img is used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO[symbol]} alt={symbol} width={s.icon} height={s.icon} className="block shrink-0 rounded-full" />
      {/* The logo's alt text already names the currency for screen readers. */}
      <span aria-hidden>{symbol}</span>
    </span>
  );
}
