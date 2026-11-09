// Firebase Cloud Storage driver.
//   - APKs are stored PRIVATE under apks/{key} and served via short-lived
//     signed URLs (V4, 5-minute expiry) minted only after the download endpoint
//     has authorized the request.
//   - Images are stored under media/{key} and made public for <img> use.

import "server-only";
import { adminBucket } from "../firebase/admin";
import type { PutResult, ResolvedDownload } from "./index";

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function putApk(buf: Buffer, key: string): Promise<PutResult> {
  const k = safeKey(key);
  const file = adminBucket().file(`apks/${k}`);
  await file.save(buf, {
    resumable: false,
    contentType: "application/vnd.android.package-archive",
    metadata: { cacheControl: "private, no-store" },
  });
  return { key: k };
}

export async function putImage(
  buf: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string }> {
  const k = safeKey(key);
  const file = adminBucket().file(`media/${k}`);
  await file.save(buf, {
    resumable: false,
    contentType,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  await file.makePublic();
  return { url: file.publicUrl() };
}

export async function resolveApkDownload(
  key: string,
  fileName: string
): Promise<ResolvedDownload> {
  const file = adminBucket().file(`apks/${safeKey(key)}`);
  const [exists] = await file.exists();
  if (!exists) {
    const err = new Error("APK object not found") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    throw err;
  }
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    responseDisposition: `attachment; filename="${fileName}"`,
  });
  return { redirectUrl: url };
}

export async function deleteApk(key: string): Promise<void> {
  try {
    await adminBucket().file(`apks/${safeKey(key)}`).delete();
  } catch {
    /* best-effort */
  }
}
