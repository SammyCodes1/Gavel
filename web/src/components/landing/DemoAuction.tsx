"use client";

import { useEffect, useRef, useState } from "react";

// A self-running, clearly labelled DEMO of a Gavel auction. Nothing here touches the chain.
const START_SECONDS = 18;
const LATE_WINDOW = 5; // demo stand-in for the real 2-minute anti-snipe window
const LATE_BONUS = 8; // demo stand-in for the real "clock goes back to 2 minutes"
const STEP = 0.25;
const PADDLES = [7, 23, 12, 41, 3, 88, 19, 56];

type DemoBid = { id: number; paddle: number; amount: number };

const initialBids: DemoBid[] = [
  { id: 2, paddle: 12, amount: 1.5 },
  { id: 1, paddle: 7, amount: 1.25 },
];

/** Hero demo: a countdown ticking, fake bids racing in, late bids extending the clock, then SOLD. */
export function DemoAuction() {
  const [seconds, setSeconds] = useState(START_SECONDS);
  const [bids, setBids] = useState<DemoBid[]>(initialBids);
  const [sold, setSold] = useState(false);
  const [extended, setExtended] = useState(0);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(3);
  const extensions = useRef(0);

  // Start paused for people who prefer reduced motion; they can press Play.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  // Keep the latest clock value handy for the bid timer (no side effects inside state updaters).
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  // The demo clock.
  useEffect(() => {
    if (paused || sold) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, sold]);

  // Hammer down at zero.
  useEffect(() => {
    if (seconds === 0 && !sold) setSold(true);
  }, [seconds, sold]);

  // Fake bidders.
  useEffect(() => {
    if (paused || sold) return;
    const t = setTimeout(
      () => {
        const id = nextId.current++;
        setBids((prev) => {
          const top = prev[0]?.amount ?? 1;
          let paddle = PADDLES[id % PADDLES.length];
          if (paddle === prev[0]?.paddle) paddle = PADDLES[(id + 3) % PADDLES.length];
          return [{ id, paddle, amount: top + STEP * (1 + (id % 3)) }, ...prev].slice(0, 4);
        });
        // Like the real anti-snipe rule: a late bid resets the clock (scaled down for the demo).
        if (secondsRef.current > 0 && secondsRef.current <= LATE_WINDOW && extensions.current < 2) {
          extensions.current += 1;
          setExtended(Date.now());
          setSeconds(LATE_BONUS);
        }
      },
      1100 + ((nextId.current * 739) % 1600),
    );
    return () => clearTimeout(t);
  }, [paused, sold, bids]);

  // After SOLD, pause for a beat, then run it again.
  useEffect(() => {
    if (!sold || paused) return;
    const t = setTimeout(() => {
      extensions.current = 0;
      setBids(initialBids);
      setSeconds(START_SECONDS);
      setSold(false);
    }, 4200);
    return () => clearTimeout(t);
  }, [sold, paused]);

  // Hide the "late bid" flag after a moment.
  useEffect(() => {
    if (!extended) return;
    const t = setTimeout(() => setExtended(0), 1800);
    return () => clearTimeout(t);
  }, [extended]);

  const closing = !sold && seconds <= LATE_WINDOW;
  const top = bids[0];

  return (
    <div
      className="relative w-full min-w-0"
      role="region"
      aria-roledescription="demo"
      aria-label="Demo auction: an example of how bidding looks. Not a real auction."
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-grape)_45%,transparent),transparent)] blur-2xl"
      />
      <div
        className={`@container relative overflow-hidden rounded-[2rem] border-2 bg-panel p-4 shadow-2xl transition-colors duration-500 sm:p-5 ${
          sold ? "border-lime" : closing ? "border-hot shadow-hot/30" : "border-line"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink">
            Demo · not a real auction
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="min-h-11 rounded-full border border-line px-3 text-xs font-bold text-muted transition hover:border-grape hover:text-fg"
          >
            {paused ? "▶ Play demo" : "❚❚ Pause demo"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hot via-grape to-usdc text-2xl"
          >
            💿
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-extrabold leading-tight">Mystery vinyl crate</div>
            <div className="text-xs text-dim">Example item · clock runs fast for the demo</div>
          </div>
        </div>

        <div
          className={`mt-4 rounded-3xl p-4 text-center transition-colors duration-500 ${
            sold ? "bg-lime/15" : closing ? "bg-hot/25" : "bg-ink/60"
          }`}
        >
          <div className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${closing ? "text-white" : "text-muted"}`}>
            {sold ? "Hammer down" : closing ? "Last seconds · late bids reset the clock" : "Time left"}
          </div>
          <div
            aria-hidden
            className={`tabular font-mono font-extrabold leading-none tracking-tight ${
              sold ? "text-lime" : closing ? "text-white motion-safe:animate-urgent" : "text-fg"
            }`}
            style={{ fontSize: "clamp(3rem, 30cqi, 6.5rem)" }}
          >
            00:{seconds.toString().padStart(2, "0")}
          </div>
          <div className="mt-2 h-8">
            {extended > 0 && !sold && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-ink motion-safe:animate-pop">
                ⏱ Late bid! Clock reset
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-dim">{sold ? "Sold for" : "Top bid"}</div>
            <div
              key={top?.id}
              className="-mx-1 inline-flex items-baseline gap-1.5 rounded-lg px-1 font-display text-4xl font-extrabold motion-safe:animate-flash"
            >
              <span className="tabular">{top?.amount.toFixed(2)}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/monad.svg" alt="MON" width={22} height={22} className="self-center" />
            </div>
          </div>
          <div className="shrink-0 text-right text-xs text-muted">
            <div className="font-bold text-fg">Paddle {top?.paddle}</div>
            {sold ? "wins it" : "is winning"}
          </div>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5" aria-hidden>
          {bids.map((b, i) => (
            <li
              key={b.id}
              className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm motion-safe:animate-bid-in ${
                i === 0 ? "bg-lime/10 ring-1 ring-inset ring-lime/50" : "bg-panel-2/70"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-grape text-[10px] font-extrabold text-white">
                  {b.paddle}
                </span>
                Paddle {b.paddle}
              </span>
              <span className={`tabular font-mono ${i === 0 ? "font-extrabold text-lime" : "text-muted"}`}>
                {b.amount.toFixed(2)} MON
              </span>
            </li>
          ))}
        </ul>

        {sold && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/55 backdrop-blur-[2px]">
            <div className="flex flex-col items-center">
              <span className="block origin-bottom-right text-6xl motion-safe:animate-strike">🔨</span>
              <span className="mt-2 rounded-2xl border-4 border-lime px-5 py-1 font-display text-6xl font-extrabold uppercase text-lime motion-safe:animate-stamp [transform:rotate(-10deg)]">
                Sold!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
