// Local disk storage driver. APKs live under /public/apks and are streamed via
// the controlled download endpoint (never linked directly). Images live under
// /public/media and are served statically.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { PutResult, ResolvedDownload } from "./index";

const APK_DIR = path.join(process.cwd(), "public", "apks");
const MEDIA_DIR = path.join(process.cwd(), "public", "media");

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function putApk(buf: Buffer, key: string): Promise<PutResult> {
  const k = safeKey(key);
  await fs.mkdir(APK_DIR, { recursive: true });
  await fs.writeFile(path.join(APK_DIR, k), buf);
  return { key: k };
}

export async function putImage(
  buf: Buffer,
  key: string,
  _contentType: string
): Promise<{ url: string }> {
  const k = safeKey(key);
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.writeFile(path.join(MEDIA_DIR, k), buf);
  return { url: `/media/${k}` };
}

export async function resolveApkDownload(
  key: string,
  _fileName: string
): Promise<ResolvedDownload> {
  const filePath = path.join(APK_DIR, safeKey(key));
  const data = await fs.readFile(filePath); // throws if missing -> caller handles
  return { stream: { data } };
}

export async function deleteApk(key: string): Promise<void> {
  try {
    await fs.unlink(path.join(APK_DIR, safeKey(key)));
  } catch {
    /* best-effort */
  }
}
