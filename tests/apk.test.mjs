import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

// Verifies that the seeded APK placeholders are structurally valid ZIP/APK
// containers (correct magic bytes), matching the upload validator's contract.
const APK_MAGICS = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

test("seeded APKs (if present) have valid ZIP magic", async () => {
  const dir = path.join(process.cwd(), "public", "apks");
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".apk"));
  } catch {
    // No apks dir yet — skip gracefully.
    return;
  }
  if (files.length === 0) return;
  for (const f of files) {
    const buf = await fs.readFile(path.join(dir, f));
    const header = buf.subarray(0, 4);
    const ok = APK_MAGICS.some((m) => header.equals(m));
    assert.ok(ok, `${f} should start with ZIP magic bytes`);
  }
});
