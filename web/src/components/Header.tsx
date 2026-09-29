"use client";

import Link from "next/link";
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

/** Header shown on every page: logo, create link, wallet button, and withdraw banner. */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl" aria-label="Gavel home">
          <Logo />
          <span className="font-display text-2xl font-extrabold tracking-tight">Gavel</span>
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted sm:inline">
            Monad testnet
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main">
          <Link
            href="/create"
            className="inline-flex items-center gap-1 rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold transition hover:border-grape hover:bg-panel-2"
          >
            <span aria-hidden className="text-lg leading-none text-lime">
              +
            </span>
            <span className="sm:hidden">Sell</span>
            <span className="hidden sm:inline">Create auction</span>
          </Link>
          <ConnectButton />
        </nav>
      </div>
      <WithdrawBanner />
    </header>
  );
}
