import Link from "next/link";
import { DemoAuction } from "@/components/landing/DemoAuction";
import { LiveStats } from "@/components/landing/LiveStats";

const STEPS = [
  {
    kicker: "01",
    word: "List it",
    title: "Put something up",
    text: "Add a title, a photo link, a starting price and how long it runs. Pick whether you get paid in MON or USDC.",
    color: "text-grape-soft",
    outline: "#bcaeff",
  },
  {
    kicker: "02",
    word: "Going once…",
    title: "Paddles up",
    text: "Bidders raise the price in real time. Each bid is a Monad transaction that lands in about a second, and every screen updates live.",
    color: "text-hot-soft",
    outline: "#ff8fab",
  },
  {
    kicker: "03",
    word: "Going twice…",
    title: "No sniping",
    text: "A bid in the final 2 minutes puts 2 minutes back on the clock. Nobody wins by jumping in at the last second. Everyone gets a fair chance to answer.",
    color: "text-sun",
    outline: "#ffc23d",
  },
  {
    kicker: "04",
    word: "Outbid?",
    title: "Your money waits for you",
    text: "When someone beats your bid, your money isn't lost or stuck. Gavel keeps it for you and shows a Collect button so you can take it back any time.",
    color: "text-usdc-soft",
    outline: "#9cc5ff",
  },
  {
    kicker: "05",
    word: "SOLD!",
    title: "Hammer down",
    text: "When the clock hits zero, anyone can settle the auction. The seller collects the winning bid, and seller and winner arrange delivery.",
    color: "text-lime",
    outline: "#d4ff3a",
  },
];

const WHY = [
  {
    icon: "👀",
    title: "Every bid is public",
    text: "Bids are recorded on Monad, so anyone can check them. No fake bids from the back room.",
  },
  {
    icon: "🔒",
    title: "Bids can't be quietly pulled",
    text: "The top bid is locked in until someone beats it. What you see on the screen is what's really there.",
  },
  {
    icon: "🤝",
    title: "No middleman holds the money",
    text: "A smart contract (a public program on Monad) holds the bids and pays the seller. No company sits in between.",
  },
  {
    icon: "🧾",
    title: "No platform cut",
    text: "The Gavel contract takes no fee. You only pay Monad's small network fee for each transaction.",
  },
];

const IDEAS = [
  ["🎤", "Video shoutouts"],
  ["📞", "1-on-1 calls"],
  ["👕", "Merch drops"],
  ["🎨", "Art & prints"],
  ["✍️", "Signed gear"],
  ["🎟️", "Event tickets"],
  ["🎧", "Studio sessions"],
  ["🧁", "Homemade treats"],
  ["🎮", "Game coaching"],
  ["📚", "Rare books"],
];

const FAQ = [
  {
    q: "Do I need to know crypto to use Gavel?",
    a: "Not much. You need a browser wallet (like MetaMask) to sign in and approve each bid. Gavel explains every step in plain words, and buttons tell you exactly what happens next.",
  },
  {
    q: "Is this real money?",
    a: "Not right now. Gavel runs on Monad testnet, a practice network, so you're using test tokens, not real money.",
  },
  {
    q: "What happens if I'm outbid?",
    a: "Your bid amount goes back to your Gavel balance straight away. A banner appears at the top of the page with a Collect button to withdraw it to your wallet.",
  },
  {
    q: "What is anti-sniping?",
    a: "Sniping is bidding in the very last second so nobody can respond. On Gavel, any bid in the final 2 minutes puts the clock back to 2 minutes, so there's always time to answer.",
  },
  {
    q: "What's the difference between MON and USDC?",
    a: "MON is Monad's own coin: bidding is one step. USDC is a digital dollar: you first approve the exact amount, then place the bid. The seller picks which one an auction uses.",
  },
  {
    q: "Who holds the money during an auction?",
    a: "The Gavel smart contract. It keeps the highest bid, gives outbid money back to its owner, and credits the seller when the auction is settled.",
  },
  {
    q: "How does the item get to the winner?",
    a: "Gavel handles the bidding and the payment. Delivery of the item is arranged between the seller and the winner.",
  },
];

const ctaPrimary =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-lime px-7 text-lg font-extrabold text-ink shadow-[0_14px_36px_-12px] shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-deep";
const ctaSecondary =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-line bg-panel px-7 text-lg font-bold transition hover:-translate-y-0.5 hover:border-grape";

/** Landing page: what Gavel is, how an auction runs, and where to go next. */
export default function LandingPage() {
  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-hot/40 bg-hot/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-hot-soft">
            <span aria-hidden>🔨</span> A live auction house on Monad
          </p>
          <h1 className="mt-5 font-display text-[clamp(3rem,13vw,6.5rem)] font-extrabold leading-[0.86] tracking-tight">
            Raise your
            <span className="ml-[0.2em] whitespace-nowrap">
              <span className="text-lime">paddle</span>
              <span className="text-hot">.</span>
              <span aria-hidden className="ml-[0.1em] inline-block align-top text-[0.5em] motion-safe:animate-float">
                🙋
              </span>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
            Sell anything to the highest bidder, live. Every bid lands in about a second, late bids put time back on
            the clock, and outbid money always comes back to you.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <Link href="/auctions" className={ctaPrimary}>
              Browse live auctions <span aria-hidden>→</span>
            </Link>
            <Link href="/create" className={ctaSecondary}>
              Sell something
            </Link>
          </div>
        </div>
        <DemoAuction />
      </section>

      <LiveStats />

      {/* How it works: going once, going twice, sold */}
      <section aria-labelledby="how-heading" className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime">How it works</p>
          <h2 id="how-heading" className="mt-3 font-display text-[clamp(2.25rem,8vw,4rem)] font-extrabold leading-[0.95] tracking-tight">
            Going once.
            <br />
            Going twice.
            <br />
            <span className="text-lime">Sold.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted">
            A Gavel auction runs like a real auction room, just on your phone and settled onchain. Here&apos;s the whole
            thing in five beats.
          </p>
        </div>
        <ol className="flex flex-col gap-5">
          {STEPS.map((s) => (
            <li key={s.kicker} className="reveal relative overflow-hidden rounded-3xl border border-line bg-panel p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm font-bold text-dim">{s.kicker} / 05</span>
                <span className={`text-xs font-extrabold uppercase tracking-[0.16em] ${s.color}`}>{s.title}</span>
              </div>
              <p
                aria-hidden
                className="text-outline mt-3 font-display text-[clamp(2.5rem,12vw,5rem)] font-extrabold uppercase leading-none tracking-tight [overflow-wrap:anywhere]"
                style={{ ["--outline-color" as string]: s.outline }}
              >
                {s.word}
              </p>
              <h3 className="sr-only">
                {s.word} {s.title}
              </h3>
              <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* MON or USDC */}
      <section aria-labelledby="pay-heading">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime">Two ways to pay</p>
        <h2 id="pay-heading" className="mt-3 font-display text-[clamp(2.25rem,8vw,4rem)] font-extrabold leading-[0.95] tracking-tight">
          MON or USDC. <span className="text-muted">Seller&apos;s call.</span>
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border-2 border-grape/60 bg-gradient-to-br from-grape/25 via-panel to-panel p-6 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/monad.svg" alt="MON" width={64} height={64} />
            <h3 className="mt-5 font-display text-3xl font-extrabold">MON</h3>
            <p className="mt-2 text-muted">Monad&apos;s own coin. Type your bid, tap once, done.</p>
            <p className="mt-5 inline-flex rounded-full bg-grape/25 px-3 py-1 text-sm font-bold text-grape-soft">1 step to bid</p>
          </div>
          <div className="relative overflow-hidden rounded-3xl border-2 border-usdc/60 bg-gradient-to-br from-usdc/25 via-panel to-panel p-6 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/usdc.svg" alt="USDC" width={64} height={64} />
            <h3 className="mt-5 font-display text-3xl font-extrabold">USDC</h3>
            <p className="mt-2 text-muted">
              A digital dollar. Approve exactly the amount you&apos;re bidding (never more), then place the bid.
            </p>
            <p className="mt-5 inline-flex rounded-full bg-usdc/25 px-3 py-1 text-sm font-bold text-usdc-soft">2 steps to bid</p>
          </div>
        </div>
      </section>

      {/* Why onchain */}
      <section aria-labelledby="why-heading">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime">Why onchain?</p>
        <h2 id="why-heading" className="mt-3 max-w-3xl font-display text-[clamp(2.25rem,8vw,4rem)] font-extrabold leading-[0.95] tracking-tight">
          An auction room where <span className="text-hot">nobody</span> can fiddle the numbers.
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <li key={w.title} className="reveal rounded-3xl border border-line bg-panel p-6">
              <span aria-hidden className="text-4xl">
                {w.icon}
              </span>
              <h3 className="mt-4 font-display text-xl font-extrabold">{w.title}</h3>
              <p className="mt-2 text-muted">{w.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Use cases */}
      <section aria-labelledby="ideas-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="ideas-heading" className="font-display text-[clamp(2rem,7vw,3.25rem)] font-extrabold leading-[0.95] tracking-tight">
            What could you auction?
          </h2>
          <p className="text-sm text-dim">Ideas, not listings.</p>
        </div>
        <div className="marquee bleed relative mt-6 overflow-hidden py-2 sm:mx-0">
          <div className="marquee-track flex w-max gap-3 motion-safe:animate-marquee">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                className={`flex gap-3 ${copy ? "marquee-dup" : ""}`}
                aria-hidden={copy ? true : undefined}
                inert={copy ? true : undefined}
              >
                {IDEAS.map(([icon, label], i) => (
                  <li
                    key={label}
                    className={`inline-flex min-h-14 items-center gap-3 whitespace-nowrap rounded-2xl border px-5 font-display text-lg font-extrabold ${
                      ["border-grape/60 bg-grape/15", "border-hot/60 bg-hot/15", "border-lime/60 bg-lime/10", "border-usdc/60 bg-usdc/15", "border-sun/60 bg-sun/10"][i % 5]
                    }`}
                  >
                    <span aria-hidden className="text-2xl">
                      {icon}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime">Questions</p>
          <h2 id="faq-heading" className="mt-3 font-display text-[clamp(2.25rem,8vw,4rem)] font-extrabold leading-[0.95] tracking-tight">
            Fair questions.
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-panel open:border-grape/60">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-3 font-display text-lg font-bold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel-2 text-xl text-lime transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-lime/50 bg-gradient-to-br from-lime/20 via-panel to-hot/15 px-6 py-12 text-center sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-grape/30 blur-3xl" />
        <h2 className="relative font-display text-[clamp(2.5rem,10vw,5.5rem)] font-extrabold leading-[0.9] tracking-tight">
          The room is open.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-lg text-muted">
          Jump into a live auction or put something up in under a minute.
        </p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row">
          <Link href="/auctions" className={ctaPrimary}>
            See live auctions <span aria-hidden>→</span>
          </Link>
          <Link href="/create" className={ctaSecondary}>
            Create an auction
          </Link>
        </div>
      </section>
    </div>
  );
}
