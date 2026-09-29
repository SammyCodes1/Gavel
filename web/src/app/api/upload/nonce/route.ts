import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { UploadRefused, blobToken, isRateLimited, issueNonce, requestHost, requestIp } from "@/lib/server/uploadGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/upload/nonce?address=0x…  →  { nonce, expires }. Stateless (HMAC'd); nothing is stored here. */
export async function GET(request: Request) {
  const token = blobToken();
  if (!token) return NextResponse.json({ error: "Photo uploads are not set up yet." }, { status: 503 });
  try {
    requestHost(request);
  } catch (e) {
    const err = e as UploadRefused;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 403 });
  }
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (isAddress(address, { strict: false })) {
    const ip = requestIp(request);
    // Advisory only (the upload route enforces the real limit); skip if Blob is unreachable.
    const limited = await isRateLimited(token, address, ip).catch(() => false);
    if (limited) return NextResponse.json({ error: "Upload limit reached. Try again in an hour." }, { status: 429 });
  }
  return NextResponse.json(issueNonce(token), { headers: { "Cache-Control": "no-store" } });
}
