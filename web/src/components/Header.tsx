"use client";

import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { WithdrawBanner } from "./WithdrawBanner";

/** Header shown on every page: logo, create link, wallet button, and withdraw banner. */
export function Header() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="text-2xl font-bold tracking-tight text-violet-400">
          Gavel
        </Link>
        <nav className="flex flex-wrap items-center gap-3">
          <Link
            href="/create"
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-violet-400"
          >
            Create auction
          </Link>
          <ConnectButton />
        </nav>
      </div>
      <WithdrawBanner />
    </header>
  );
}
