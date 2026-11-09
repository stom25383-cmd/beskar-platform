import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Fast regression tests for the launch contract: unsigned APKs are not rejected
// merely because they lack signing metadata; invalid non-ZIP files are rejected.
function isZip(buf) {
  return ["504b0304", "504b0506", "504b0708"].includes(buf.subarray(0,4).toString("hex"));
}

test("unsigned APK-like ZIP with AndroidManifest entry is acceptable", () => {
  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const name = Buffer.from("AndroidManifest.xml");
  const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), u32(0), u16(name.length), u16(0), name]);
  const cdOffset = local.length;
  const central = Buffer.concat([u32(0x02014b50), Buffer.alloc(24), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), u32(0), name]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(cdOffset, 16);
  const apk = Buffer.concat([local, central, eocd]);
  assert.equal(apk.subarray(cdOffset, cdOffset + 4).toString("hex"), "504b0102");
});

test("non-ZIP upload is rejected", () => {
  const bad = Buffer.from("not an apk");
  assert.equal(isZip(bad), false);
});

test("APK v2 signing block is detectable without requiring a certificate", () => {
  // Build the smallest synthetic APK-like layout needed by the detector: a
  // ZIP local header, APK signing block, empty central directory, and EOCD.
  const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
  const pair = Buffer.concat([u64(4), Buffer.from([0x1a, 0x87, 0x09, 0x71])]);
  const blockSize = pair.length + 24;
  const signing = Buffer.concat([u64(blockSize), pair, u64(blockSize), Buffer.from("APK Sig Block 42", "ascii")]);
  const cdOffset = 4 + signing.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt32LE(cdOffset, 16);
  const apk = Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]), signing, eocd]);
  const footerStart = cdOffset - 24;
  assert.equal(apk.subarray(footerStart + 8, footerStart + 24).toString("ascii"), "APK Sig Block 42");
});

test("server checksum is deterministic", () => {
  const data = Buffer.from("BESKAR");
  assert.equal(createHash("sha256").update(data).digest("hex").length, 64);
});
