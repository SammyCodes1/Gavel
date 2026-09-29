import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { UploadRefused, authorizeUpload, blobToken } from "@/lib/server/uploadGuard";
import { UPLOAD_CONTENT_TYPES, UPLOAD_MAX_BYTES } from "@/lib/uploadMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notConfigured = () =>
  NextResponse.json({ enabled: false, error: "Photo uploads are not set up yet." }, { status: 503 });

/** Status check for the create page: are uploads configured? */
export async function GET() {
  if (!blobToken()) return notConfigured();
  return NextResponse.json({ enabled: true });
}

/**
 * Vercel Blob client-upload token endpoint. The browser uploads the file straight to Blob;
 * this route only decides whether to hand out a short-lived, tightly scoped token.
 */
export async function POST(request: Request) {
  const token = blobToken();
  if (!token) return notConfigured();

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  // Only token requests are expected (no upload-completed callback is configured).
  if (body?.type !== "blob.generate-client-token") return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        await authorizeUpload({ request, pathname, clientPayload, multipart, token });
        return {
          allowedContentTypes: [...UPLOAD_CONTENT_TYPES],
          maximumSizeInBytes: UPLOAD_MAX_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 5 * 60 * 1000,
          tokenPayload: null,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UploadRefused) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Upload could not be authorized" }, { status: 500 });
  }
}
