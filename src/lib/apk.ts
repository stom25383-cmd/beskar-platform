import { createHash } from "crypto";

const ZIP_MAGICS = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];
const APK_SIG_MAGIC = Buffer.from("APK Sig Block 42", "ascii");
const V2_ID = 0x7109871a;
const V3_ID = 0xf05368c0;

function u32(buf: Buffer, off: number): number { return buf.readUInt32LE(off); }
function u64(buf: Buffer, off: number): bigint { return buf.readBigUInt64LE(off); }

export function isZipContainer(buf: Buffer): boolean {
  return ZIP_MAGICS.some((m) => buf.subarray(0, 4).equals(m));
}

function hasZipEntry(buf: Buffer, wanted: string): boolean {
  const eocd = findEocd(buf);
  if (eocd < 0 || eocd + 22 > buf.length) return false;
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset + cdSize > buf.length) return false;
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || u32(buf, p) !== 0x02014b50) return false;
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    if (name === wanted) return true;
    p += 46 + nameLen + extraLen + commentLen;
    if (p > cdOffset + cdSize) return false;
  }
  return false;
}

function hasV1Signature(buf: Buffer): boolean {
  const text = buf.toString("latin1");
  return /META-INF\/[^\0\/]{1,200}\.(RSA|DSA|EC)(?:\0|\/)/i.test(text);
}

function findEocd(buf: Buffer): number {
  if (buf.length < 22) return -1;
  const start = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= start; i--) {
    if (u32(buf, i) === 0x06054b50) return i;
  }
  return -1;
}

function hasV2OrV3Signature(buf: Buffer): boolean {
  const eocd = findEocd(buf);
  if (eocd < 0 || eocd + 22 > buf.length) return false;
  const cdOffset = u32(buf, eocd + 16);
  const footerStart = cdOffset - 24;
  if (footerStart < 8 || footerStart + 24 > buf.length) return false;
  if (!buf.subarray(footerStart + 8, footerStart + 24).equals(APK_SIG_MAGIC)) return false;
  const blockSize = u64(buf, footerStart);
  const blockStart = cdOffset - Number(blockSize) - 8;
  if (blockStart < 0 || blockStart + 8 > buf.length) return false;
  let p = blockStart + 8;
  const pairsEnd = footerStart;
  while (p + 8 <= pairsEnd) {
    const pairLen = Number(u64(buf, p));
    p += 8;
    if (pairLen < 4 || p + pairLen > pairsEnd) return false;
    const id = u32(buf, p);
    if (id === V2_ID || id === V3_ID) return true;
    p += pairLen;
  }
  return false;
}

export interface ApkInspection {
  validZipContainer: boolean;
  signatureDetected: boolean;
  sha256: string;
}

export function inspectApk(buf: Buffer): ApkInspection {
  const zip = isZipContainer(buf);
  // Accept signed and unsigned APKs, but do not accept an arbitrary empty ZIP.
  // Android APKs must at least contain the Android manifest entry.
  const validApk = zip && hasZipEntry(buf, "AndroidManifest.xml");
  return {
    validZipContainer: validApk,
    signatureDetected: validApk && (hasV1Signature(buf) || hasV2OrV3Signature(buf)),
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}
