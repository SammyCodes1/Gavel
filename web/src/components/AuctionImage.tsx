import { safeImageUrl } from "@/lib/format";

/** Renders the auction image only if its URL starts with https://. */
export function AuctionImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const src = safeImageUrl(url);
  if (!src) return null;
  return (
    // Seller-provided URLs can point at any host, so next/image (which needs a host allowlist) is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" className={className} />
  );
}
