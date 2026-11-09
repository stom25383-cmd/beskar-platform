import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { shortId } from "@/lib/ids";
import { putApk } from "@/lib/storage";
import { rateLimit } from "@/lib/rateLimit";
import { inspectApk } from "@/lib/apk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 300 * 1024 * 1024; // 300 MB ceiling

/**
 * Secure APK upload:
 *  - Admin only.
 *  - Validates extension + real ZIP magic bytes (APK is a ZIP container).
 *  - Enforces size ceiling.
 *  - Computes SHA-256 server-side (integrity source of truth; client cannot
 *    supply a fake checksum).
 *  - Stores under /public/apks with a randomized key; the public download
 *    endpoint streams it (the raw path is never linked directly).
 */
export const POST = handler(async (req) => {
  const session = await requireAdmin();

  const rl = rateLimit(`apk-upload:${session.sub}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return fail("Too many uploads. Try again later.", 429);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Expected multipart form data", 400);
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided", 400);

  if (!file.name.toLowerCase().endsWith(".apk")) {
    return fail("Only .apk files are accepted.", 415);
  }
  if (file.size > MAX_BYTES) {
    return fail("File exceeds the 300 MB limit.", 413);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const inspection = inspectApk(buf);
  if (!inspection.validZipContainer) {
    return fail("The file is not a valid APK container (AndroidManifest.xml is missing).", 415);
  }

  // Signed and unsigned APKs are both accepted. A signature is informational;
  // it is never required for upload or publication.
  const sha256 = inspection.sha256;
  const { key: storageKey } = await putApk(buf, `${shortId("apk")}.apk`);

  await audit({
    actor: session.email,
    action: "apk.upload",
    resource: `apk:${storageKey}`,
    after: { fileName: file.name, size: file.size, sha256, signatureDetected: inspection.signatureDetected },
    ip: clientIp(req),
  });

  return ok({
    apkStorageKey: storageKey,
    fileName: file.name,
    fileSizeBytes: file.size,
    sha256,
    signatureVerified: inspection.signatureDetected,
  });
});
