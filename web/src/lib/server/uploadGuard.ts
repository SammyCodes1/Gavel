// Server-only module: imported only by route handlers under app/api/upload. Never import from client code.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { list, put } from "@vercel/blob";
import { createPublicClient, getAddress, http, isAddress, isHex, verifyMessage } from "viem";
import { appChain } from "@/config/chains";
import { UPLOAD_NONCE_TTL_MS, UPLOAD_PATHNAME_RE, buildUploadMessage } from "@/lib/uploadMessage";

/** Hosts allowed to appear as the signed domain (and as the request Host). */
const ALLOWED_HOSTS = ["gavel-gamma.vercel.app"];
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
const CLOCK_SKEW_MS = 5_000;
/** Uploads allowed per wallet and per IP in one clock hour. */
export const UPLOADS_PER_HOUR = 10;
const INTERNAL_PREFIX = "gavel-internal";

export class UploadRefused extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** The Blob read-write token. Server-only: it signs upload tokens and nonces and must never reach the browser. */
export function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

function hmac(key: string, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

/** Stateless nonce: random.expires.HMAC(random.expires). Nothing is stored until it's used. */
export function issueNonce(key: string): { nonce: string; expires: number } {
  const random = randomBytes(16).toString("hex");
  const expires = Date.now() + UPLOAD_NONCE_TTL_MS;
  return { nonce: `${random}.${expires}.${hmac(key, `${random}.${expires}`)}`, expires };
}

/** Check the nonce's HMAC and expiry. Returns its expiry time. */
function checkNonce(key: string, nonce: string): number {
  const m = /^([0-9a-f]{32})\.(\d{13})\.([0-9a-f]{64})$/.exec(nonce);
  if (!m) throw new UploadRefused("Invalid nonce");
  const expected = Buffer.from(hmac(key, `${m[1]}.${m[2]}`), "hex");
  const given = Buffer.from(m[3], "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new UploadRefused("Invalid nonce");
  const expires = Number(m[2]);
  const now = Date.now();
  if (expires <= now) throw new UploadRefused("This upload request expired. Please try again.", 401);
  if (expires > now + UPLOAD_NONCE_TTL_MS + CLOCK_SKEW_MS) throw new UploadRefused("Invalid nonce");
  return expires;
}

/** Host the request was made to, if it's one we serve. */
export function requestHost(request: Request): string {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (!ALLOWED_HOSTS.includes(host) && !LOCAL_HOST_RE.test(host)) throw new UploadRefused("Uploads are not allowed from this site", 403);
  return host;
}

/** Caller IP as reported by the Vercel edge (x-forwarded-for first hop). */
export function requestIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

type Payload = { address: `0x${string}`; message: string; signature: `0x${string}` };

function parsePayload(clientPayload: string | null): Payload {
  if (!clientPayload || clientPayload.length > 2_000) throw new UploadRefused("Missing wallet signature", 401);
  let data: unknown;
  try {
    data = JSON.parse(clientPayload);
  } catch {
    throw new UploadRefused("Missing wallet signature", 401);
  }
  const { address, message, signature } = (data ?? {}) as Record<string, unknown>;
  if (typeof address !== "string" || !isAddress(address, { strict: false })) throw new UploadRefused("Invalid address", 401);
  if (typeof message !== "string" || message.length > 500) throw new UploadRefused("Invalid message", 401);
  if (typeof signature !== "string" || !isHex(signature) || signature.length > 4_000) throw new UploadRefused("Invalid signature", 401);
  return { address: getAddress(address), message, signature };
}

/** EOA signatures, plus smart-contract wallets (ERC-1271 / ERC-6492) through the Monad testnet RPC when reachable. */
async function signatureIsValid(p: Payload): Promise<boolean> {
  try {
    const client = createPublicClient({ chain: appChain, transport: http(undefined, { timeout: 8_000 }) });
    return await client.verifyMessage({ address: p.address, message: p.message, signature: p.signature });
  } catch {
    // RPC unavailable: fall back to plain EOA recovery (no smart-wallet support in that case).
    return verifyMessage({ address: p.address, message: p.message, signature: p.signature }).catch(() => false);
  }
}

function hourBucket(d = new Date()): string {
  return d.toISOString().slice(0, 13).replace(/[-T]/g, ""); // yyyymmddhh (UTC)
}

async function countMarkers(prefix: string, token: string): Promise<number> {
  const { blobs } = await list({ prefix, limit: UPLOADS_PER_HOUR + 1, token });
  return blobs.length;
}

/** Rate-limit keys: HMAC'd so wallet addresses and IPs don't appear in blob paths. */
function rateKeys(key: string, address: string, ip: string) {
  const bucket = hourBucket();
  const k = (kind: string, id: string) => `${INTERNAL_PREFIX}/rate/${kind}/${hmac(key, `${kind}:${id}`).slice(0, 32)}/${bucket}/`;
  return [k("addr", address.toLowerCase()), k("ip", ip)];
}

/** Advisory pre-check used by the nonce endpoint so the UI can say "limit reached" before asking for a signature. */
export async function isRateLimited(key: string, address: string, ip: string): Promise<boolean> {
  const counts = await Promise.all(rateKeys(key, address, ip).map((p) => countMarkers(p, key)));
  return counts.some((c) => c >= UPLOADS_PER_HOUR);
}

/**
 * Everything that must pass before a client upload token is issued:
 * pathname, domain + Host, nonce HMAC + expiry, exact message, wallet signature,
 * per-wallet and per-IP hourly limits, and a one-time nonce claim (replay protection).
 */
export async function authorizeUpload(opts: {
  request: Request;
  pathname: string;
  clientPayload: string | null;
  multipart: boolean;
  token: string;
}): Promise<{ address: string }> {
  const { request, pathname, clientPayload, multipart, token } = opts;
  if (multipart) throw new UploadRefused("Multipart uploads are not allowed");
  if (!UPLOAD_PATHNAME_RE.test(pathname)) throw new UploadRefused("Invalid file name");

  const host = requestHost(request);
  const p = parsePayload(clientPayload);
  const nonce = /\nNonce: ([^\n]+)\n/.exec(p.message)?.[1] ?? "";
  const expires = checkNonce(token, nonce);
  if (p.message !== buildUploadMessage(host, p.address, nonce, expires)) throw new UploadRefused("Signed message does not match", 401);
  if (!(await signatureIsValid(p))) throw new UploadRefused("Wallet signature is not valid", 401);

  // Persistent (Blob-backed) hourly limits, shared by all serverless instances.
  const ip = requestIp(request);
  const prefixes = rateKeys(token, p.address, ip);
  const counts = await Promise.all(prefixes.map((prefix) => countMarkers(prefix, token)));
  if (counts.some((c) => c >= UPLOADS_PER_HOUR)) throw new UploadRefused("Upload limit reached. Try again in an hour.", 429);

  // Claim the nonce exactly once: allowOverwrite:false makes a second put of the same pathname fail.
  const nonceId = createHash("sha256").update(nonce).digest("hex");
  try {
    await put(`${INTERNAL_PREFIX}/nonces/${nonceId}`, "1", {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "text/plain",
      token,
    });
  } catch {
    // Already claimed (replay) or Blob unavailable: fail closed either way.
    throw new UploadRefused("This upload request was already used. Please try again.", 409);
  }

  // Count this upload against both limits (tiny marker blobs; they accumulate slowly).
  await Promise.all(
    prefixes.map((prefix) =>
      put(`${prefix}${randomBytes(8).toString("hex")}`, "1", {
        access: "public",
        addRandomSuffix: false,
        contentType: "text/plain",
        token,
      }),
    ),
  );
  return { address: p.address };
}
