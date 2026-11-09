// ============================================================================
// Storage abstraction — the seam for binary assets (APKs, images).
//
// Two drivers implement the same contract:
//   - local:    files under /public (streamed via controlled endpoints)
//   - firebase: Cloud Storage objects (private APKs served via short-lived
//               signed URLs; public media via public objects)
//
// Selected by BESKAR_STORAGE_DRIVER (defaults to mirror BESKAR_DRIVER). Call
// sites never branch on the driver — they use these functions.
// ============================================================================

import "server-only";
import { env } from "../env";
import * as local from "./local";
import * as firebase from "./firebase";

export interface PutResult {
  /** opaque storage key persisted on the Release/Application */
  key: string;
}

export interface ResolvedDownload {
  /** when the server should stream bytes itself (local driver) */
  stream?: { data: Buffer };
  /** when the client should be redirected to a signed URL (firebase driver) */
  redirectUrl?: string;
}

const driver = () => (env.storageDriver() === "firebase" ? firebase : local);

/** Store an APK. Returns the storage key to persist on the release. */
export function putApk(buf: Buffer, key: string): Promise<PutResult> {
  return driver().putApk(buf, key);
}

/** Store a public image (icon/screenshot). Returns a URL usable in <img>. */
export function putImage(
  buf: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string }> {
  return driver().putImage(buf, key, contentType);
}

/**
 * Resolve an APK download for a given storage key. Local streams bytes;
 * Firebase returns a signed URL to redirect to.
 */
export function resolveApkDownload(
  key: string,
  fileName: string
): Promise<ResolvedDownload> {
  return driver().resolveApkDownload(key, fileName);
}

/** Delete an APK object (best-effort). */
export function deleteApk(key: string): Promise<void> {
  return driver().deleteApk(key);
}

export function activeStorageDriver(): "local" | "firebase" {
  return env.storageDriver();
}
