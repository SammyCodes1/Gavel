import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Gavel: live onchain auctions on Monad",
  description: "Create auctions, bid in MON or USDC, and settle onchain.",
};

/** Root layout: providers, header (with withdraw banner) and page content. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
