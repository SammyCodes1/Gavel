import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

// Fonts are downloaded at build time and served from this site (next/font), so the CSP's
// font-src 'self' keeps working and no font CDN is contacted at runtime.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Gavel: live onchain auctions on Monad",
  description: "Create auctions, bid in MON or USDC, and settle onchain.",
};

export const viewport: Viewport = {
  themeColor: "#0a0612",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the gutters use env(safe-area-inset-*)
};

/** Root layout: providers, header (with withdraw banner) and page content. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen text-fg antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        <Providers>
          <Header />
          <main id="main" className="gutter mx-auto w-full max-w-6xl pb-16 pt-6 sm:pt-10">
            {children}
          </main>
          <footer className="gutter border-t border-line/60 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-8 text-center text-sm text-dim sm:pb-[max(2rem,env(safe-area-inset-bottom))]">
            Every bid is a Monad testnet transaction. A bid in the final 2 minutes puts the clock back to 2:00, so nobody gets sniped.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
