import { safeImageUrl } from "@/lib/format";

// Colourful gradients used when an auction has no (https) photo, picked from the title.
const GRADIENTS = [
  "from-grape via-hot to-sun",
  "from-hot via-grape to-usdc",
  "from-usdc via-grape to-lime",
  "from-lime via-sun to-hot",
  "from-grape via-usdc to-hot",
];

/** Renders the auction image only if its URL starts with https://. */
export function AuctionImage({
  url,
  alt,
  className,
  fallback = false,
  fallbackClassName = "",
}: {
  url: string;
  alt: string;
  className?: string;
  /** Show a colourful placeholder (with the title's first letter) instead of nothing. */
  fallback?: boolean;
  fallbackClassName?: string;
}) {
  const src = safeImageUrl(url);
  if (!src) {
    if (!fallback) return null;
    let hash = 0;
    for (const ch of alt) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const letter = alt.trim().charAt(0).toUpperCase() || "G";
    return (
      <div
        aria-hidden
        className={`relative grid place-items-center overflow-hidden bg-gradient-to-br ${GRADIENTS[hash % GRADIENTS.length]} ${fallbackClassName}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <span className="relative font-display text-7xl font-extrabold text-white/90 drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
          {letter}
        </span>
      </div>
    );
  }
  return (
    // Seller-provided URLs can point at any host, so next/image (which needs a host allowlist) is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" className={className} />
  );
}
