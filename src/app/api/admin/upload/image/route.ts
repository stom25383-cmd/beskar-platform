import { handler, ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/ids";
import { putImage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED: Record<string, { ext: string; magic: number[] }> = {
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/webp": { ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
};

/** Secure image upload for icons/screenshots with MIME + magic validation. */
export const POST = handler(async (req) => {
  await requireAdmin();
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Expected multipart form data", 400);
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided", 400);
  if (file.size > MAX_BYTES) return fail("Image exceeds the 6 MB limit.", 413);

  const spec = ALLOWED[file.type];
  if (!spec) return fail("Only PNG, JPEG, or WebP images are accepted.", 415);

  const buf = Buffer.from(await file.arrayBuffer());
  const magicOk = spec.magic.every((b, i) => buf[i] === b);
  if (!magicOk) return fail("File contents do not match its type.", 415);

  const key = `${shortId("img")}.${spec.ext}`;
  const { url } = await putImage(buf, key, file.type);

  return ok({ url });
});
