// Shared by the browser (to build the message the wallet signs) and the upload route (to rebuild
// and compare it exactly). No secrets here.

/** Pathnames the client may ask to upload to. Anything else (e.g. internal marker paths) is refused. */
export const UPLOAD_PATHNAME_RE = /^auctions\/[a-z0-9][a-z0-9-]{0,39}\.(jpg|png|webp)$/;

export const UPLOAD_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
/** Nonces (and the signature built on them) are valid for at most this long. */
export const UPLOAD_NONCE_TTL_MS = 5 * 60 * 1000;

/** The exact text the wallet signs before a photo upload. */
export function buildUploadMessage(domain: string, address: string, nonce: string, expiresMs: number): string {
  return [
    `${domain} wants you to upload a photo.`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresMs).toISOString()}`,
  ].join("\n");
}
