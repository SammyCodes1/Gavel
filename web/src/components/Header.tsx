"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { WithdrawBanner } from "./WithdrawBanner";

/** Gavel mark: a small hammer on a lime tile. */
function Logo() {
  return (
    <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-ink shadow-[0_0_24px_-6px] shadow-lime">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M14.5 3.5l6 6M12 6l6 6M16.5 5.5l-6 6M10 14l-6.5 6.5" />
        <path d="M13 21h8" />
      </svg>
    </span>
  );
}

const NAV = [
  { href: "/", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/auctions", label: "Auctions", icon: "M13 3l8 8-3 3-8-8zM10.5 8.5l-7 7 3 3 7-7M14 21h7" },
  { href: "/create", label: "Sell", icon: "M12 5v14M5 12h14" },
];

/** True when `href` is the current section (auction detail pages count as "Auctions"). */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/auctions") return pathname.startsWith("/auction");
  return pathname.startsWith(href);
}

/** Header shown on every page: logo, nav, wallet button, withdraw banner, and a bottom tab bar on phones. */
export function Header() {
  const pathname = usePathname() ?? "/";
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="gutter mx-auto flex w-full max-w-6xl items-center justify-between gap-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link href="/" className="flex min-h-11 min-w-11 shrink-0 items-center gap-2.5 rounded-xl" aria-label="Gavel home">
            <Logo />
            <span className="font-display text-2xl font-extrabold tracking-tight">Gavel</span>
            <span className="hidden whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted lg:inline">
              Monad testnet
            </span>
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {/* Tablet/desktop nav. Phones use the bottom tab bar instead. */}
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
              <Link
                href="/auctions"
                aria-current={isActive(pathname, "/auctions") ? "page" : undefined}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-muted transition hover:text-fg aria-[current=page]:text-fg"
              >
                Auctions
              </Link>
              <Link
                href="/create"
                aria-current={isActive(pathname, "/create") ? "page" : undefined}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-line bg-panel px-3 text-sm font-semibold transition hover:border-grape hover:bg-panel-2"
              >
                <span aria-hidden className="text-lg leading-none text-lime">
                  +
                </span>
                Create auction
              </Link>
            </nav>
            <ConnectButton />
          </div>
        </div>
        <WithdrawBanner />
      </header>

      {/* Phone tab bar: thumb-reachable, clears the home indicator (safe-area-inset-bottom). */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <ul className="gutter grid grid-cols-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition ${
                    active ? "text-lime" : "text-muted hover:text-fg"
                  }`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
