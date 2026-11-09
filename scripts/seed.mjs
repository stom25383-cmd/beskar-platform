// Seed the local store with a premium demo catalog.
// - Generates VALID minimal APK (ZIP) placeholders so downloads work in preview.
// - Computes real SHA-256 checksums server-side style.
// - Seeds apps, releases, a few moderated reviews, legal docs, site config.
//
// Run: npm run seed   (safe to re-run; it overwrites data/beskar.json)

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import zlib from "zlib";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const APK_DIR = path.join(ROOT, "public", "apks");

function uuid() {
  return crypto.randomUUID();
}
function short(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}
function token(n = 32) {
  return crypto.randomBytes(n).toString("base64url");
}

// Build a minimal but structurally valid ZIP (APK is a ZIP) with one file.
function makeZip(name, content) {
  const data = Buffer.from(content, "utf8");
  const nameBuf = Buffer.from(name, "utf8");
  const crc = zlib.crc32 ? zlib.crc32(data) : crc32(data);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0); // local file header sig
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(0, 8); // method: store
  localHeader.writeUInt16LE(0, 10); // mod time
  localHeader.writeUInt16LE(0, 12); // mod date
  localHeader.writeUInt32LE(crc >>> 0, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc >>> 0, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42); // offset of local header

  const localBlock = Buffer.concat([localHeader, nameBuf, data]);
  const centralBlock = Buffer.concat([central, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralBlock.length, 12);
  eocd.writeUInt32LE(localBlock.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localBlock, centralBlock, eocd]);
}

// Fallback CRC32 if zlib.crc32 unavailable.
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

async function writeApk(slug, versionName) {
  const content = `BESKAR placeholder package for ${slug} v${versionName}. This is a valid ZIP/APK container used for the demo catalog. Replace with a real signed APK via the admin panel.`;
  const buf = makeZip("beskar-manifest.txt", content);
  const key = `${short("apk")}.apk`;
  await fs.writeFile(path.join(APK_DIR, key), buf);
  const sha = crypto.createHash("sha256").update(buf).digest("hex");
  return { key, sha, size: buf.length };
}

function rating(dist) {
  const count = Object.values(dist).reduce((a, b) => a + b, 0);
  const sum = Object.entries(dist).reduce((a, [k, v]) => a + Number(k) * v, 0);
  return {
    count,
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    distribution: dist,
  };
}

async function buildApp(def) {
  const now = new Date();
  const releases = [];
  let currentReleaseId = null;
  for (let i = 0; i < def.releases.length; i++) {
    const r = def.releases[i];
    const apk = await writeApk(def.slug, r.versionName);
    const rel = {
      id: short("rel"),
      versionName: r.versionName,
      versionCode: r.versionCode,
      releaseDate: r.releaseDate,
      changelog: r.changelog,
      apkStorageKey: apk.key,
      fileName: `${def.slug}-${r.versionName}.apk`,
      fileSizeBytes: r.sizeOverride ?? apk.size,
      sha256: apk.sha,
      minAndroid: r.minAndroid,
      targetAndroid: r.targetAndroid,
      status: "published",
    };
    releases.push(rel);
    currentReleaseId = rel.id;
  }
  return {
    id: uuid(),
    slug: def.slug,
    name: def.name,
    tagline: def.tagline,
    description: def.description,
    iconUrl: def.iconUrl,
    screenshots: def.screenshots,
    category: def.category,
    features: def.features,
    pricing: def.pricing,
    releases,
    currentReleaseId,
    status: "published",
    featured: def.featured,
    order: def.order,
    privacyNote: def.privacyNote,
    permissions: def.permissions,
    developer: "BESKAR",
    downloadCount: def.downloadCount,
    rating: rating(def.dist),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

const DEFS = [
  {
    slug: "atlas-vault",
    name: "Atlas Vault",
    tagline: "Encrypted secrets and passwords, engineered for peace of mind.",
    description: `Atlas Vault is a zero-knowledge password and secrets manager built for people who take security seriously.

Everything is encrypted on your device before it ever leaves it. Unlock with biometrics, organize with collections, and audit weak or reused credentials with the built-in strength analyzer.

Designed with BESKAR's obsession for precision — fast, private, and beautifully restrained.`,
    iconUrl: "/media/icon-vault.png",
    category: "Security",
    featured: true,
    order: 0,
    downloadCount: 18432,
    dist: { "1": 3, "2": 2, "3": 8, "4": 41, "5": 122 },
    pricing: {
      model: "paid",
      price: 1499,
      mrp: 2499,
      currency: "USD",
      lifetime: true,
    },
    permissions: [
      "Biometric hardware (fingerprint / face unlock)",
      "Camera (optional — scan QR for TOTP)",
      "Autofill service",
    ],
    privacyNote:
      "Atlas Vault uses zero-knowledge encryption. Your vault is encrypted on-device with a key derived from your master password. BESKAR cannot read your data.",
    features: [
      "Zero-knowledge on-device encryption",
      "Biometric unlock",
      "Password strength & breach auditing",
      "TOTP two-factor codes",
      "Encrypted notes & attachments",
      "Autofill across apps",
    ],
    screenshots: [
      { url: "/media/shot-vault-1.png", alt: "Atlas Vault entry list" },
      { url: "/media/shot-vault-2.png", alt: "Atlas Vault entry detail" },
    ],
    releases: [
      {
        versionName: "1.2.0",
        versionCode: 3,
        releaseDate: "2026-08-10",
        minAndroid: "9.0",
        targetAndroid: "14",
        sizeOverride: 24_117_248,
        changelog:
          "• New breach-audit engine\n• Faster biometric unlock\n• Refined collection management\n• Bug fixes and stability improvements",
      },
      {
        versionName: "1.1.0",
        versionCode: 2,
        releaseDate: "2026-06-02",
        minAndroid: "9.0",
        targetAndroid: "14",
        sizeOverride: 22_020_096,
        changelog: "• Added TOTP support\n• Autofill improvements",
      },
      {
        versionName: "1.0.0",
        versionCode: 1,
        releaseDate: "2026-04-18",
        minAndroid: "8.0",
        targetAndroid: "13",
        sizeOverride: 20_971_520,
        changelog: "• Initial release",
      },
    ],
  },
  {
    slug: "aperture-pro",
    name: "Aperture Pro",
    tagline: "A manual camera that respects the craft of photography.",
    description: `Aperture Pro turns your Android device into a precision imaging tool.

Take full manual control of ISO, shutter speed, white balance, and focus. Shoot RAW, review with a live histogram, and process with a refined, distraction-free editor.

Free to install. Unlock RAW capture and the pro editing suite with a single in-app upgrade.`,
    iconUrl: "/media/icon-lens.png",
    category: "Photography",
    featured: true,
    order: 1,
    downloadCount: 42901,
    dist: { "1": 5, "2": 6, "3": 20, "4": 88, "5": 210 },
    pricing: {
      model: "freemium",
      price: 0,
      mrp: 0,
      currency: "USD",
      lifetime: false,
      freemiumNote:
        "Aperture Pro is free to install with full manual controls. The Pro upgrade unlocks RAW/DNG capture, the advanced editor, and batch export via an in-app subscription.",
    },
    permissions: [
      "Camera",
      "Microphone (video capture)",
      "Photos & media (save results)",
    ],
    privacyNote:
      "Aperture Pro processes images on-device. No photos are uploaded to BESKAR servers.",
    features: [
      "Full manual controls (ISO, shutter, WB, focus)",
      "RAW / DNG capture (Pro)",
      "Live histogram & focus peaking",
      "Distraction-free pro editor (Pro)",
      "Batch export (Pro)",
    ],
    screenshots: [
      { url: "/media/shot-lens-1.png", alt: "Aperture Pro manual controls" },
      { url: "/media/shot-lens-2.png", alt: "Aperture Pro gallery" },
    ],
    releases: [
      {
        versionName: "3.4.1",
        versionCode: 41,
        releaseDate: "2026-08-19",
        minAndroid: "10.0",
        targetAndroid: "14",
        sizeOverride: 38_797_312,
        changelog:
          "• New focus-peaking overlay\n• Improved RAW pipeline\n• Editor performance boost",
      },
      {
        versionName: "3.3.0",
        versionCode: 38,
        releaseDate: "2026-05-27",
        minAndroid: "10.0",
        targetAndroid: "14",
        sizeOverride: 36_700_160,
        changelog: "• Batch export\n• White balance presets",
      },
    ],
  },
  {
    slug: "pulse-health",
    name: "Pulse",
    tagline: "Understand your body with a calm, private health companion.",
    description: `Pulse brings your activity, heart rate, and sleep together in one calm, private dashboard.

No noise, no gamification traps — just clear signal about how you're doing, with trends that actually help you decide what to do next.

Completely free. No ads. No account required.`,
    iconUrl: "/media/icon-pulse.png",
    category: "Health & Fitness",
    featured: false,
    order: 2,
    downloadCount: 30115,
    dist: { "1": 2, "2": 4, "3": 15, "4": 60, "5": 149 },
    pricing: {
      model: "free",
      price: 0,
      mrp: 0,
      currency: "USD",
      lifetime: false,
    },
    permissions: [
      "Physical activity / sensors",
      "Body sensors (heart rate)",
      "Notifications",
    ],
    privacyNote:
      "Pulse stores health data locally on your device. No account is required and nothing is sent to BESKAR by default.",
    features: [
      "Unified activity, heart rate & sleep",
      "Clean trend analysis",
      "No ads, no account",
      "Local-first data storage",
    ],
    screenshots: [
      { url: "/media/shot-pulse-1.png", alt: "Pulse health dashboard" },
    ],
    releases: [
      {
        versionName: "2.1.0",
        versionCode: 12,
        releaseDate: "2026-08-05",
        minAndroid: "8.0",
        targetAndroid: "14",
        sizeOverride: 16_777_216,
        changelog: "• Sleep staging\n• Weekly trend summaries\n• Accessibility improvements",
      },
    ],
  },
  {
    slug: "ledger-one",
    name: "Ledger One",
    tagline: "Personal finance with clarity, not clutter.",
    description: `Ledger One is a private, offline-first money manager.

Track spending, set envelopes, and see exactly where your money goes with elegant, honest charts. Multi-currency aware, so your numbers make sense wherever you are.

Buy once. Yours for life.`,
    iconUrl: "/media/icon-ledger.png",
    category: "Finance",
    featured: false,
    order: 3,
    downloadCount: 9204,
    dist: { "1": 1, "2": 1, "3": 4, "4": 22, "5": 63 },
    pricing: {
      model: "paid",
      price: 999,
      mrp: 1499,
      currency: "USD",
      lifetime: true,
    },
    permissions: ["Notifications", "Storage (import/export CSV)"],
    privacyNote:
      "Ledger One is offline-first. Your financial data stays on your device unless you explicitly export it.",
    features: [
      "Envelope budgeting",
      "Multi-currency aware",
      "Beautiful honest charts",
      "CSV import / export",
      "Offline-first, private by default",
    ],
    screenshots: [
      { url: "/media/shot-ledger-1.png", alt: "Ledger One dashboard" },
    ],
    releases: [
      {
        versionName: "1.0.4",
        versionCode: 5,
        releaseDate: "2026-07-22",
        minAndroid: "9.0",
        targetAndroid: "14",
        sizeOverride: 19_922_944,
        changelog: "• Multi-currency display\n• Export improvements\n• Bug fixes",
      },
    ],
  },
];

const REVIEW_SEEDS = [
  {
    slug: "atlas-vault",
    author: "Devangi R.",
    stars: 5,
    title: "Finally a vault I trust",
    body: "The zero-knowledge model and biometric unlock are exactly what I wanted. Fast and beautifully designed.",
  },
  {
    slug: "atlas-vault",
    author: "M. Okafor",
    stars: 4,
    title: "Excellent, minor nitpicks",
    body: "Autofill works great. Would love a desktop companion someday.",
  },
  {
    slug: "aperture-pro",
    author: "Ken T.",
    stars: 5,
    title: "The manual controls are superb",
    body: "Focus peaking and RAW capture make this my default camera now.",
  },
  {
    slug: "pulse-health",
    author: "Sara L.",
    stars: 5,
    title: "Calm and private",
    body: "No gamification nonsense. Just clear insight. Love that there's no account.",
  },
];

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(APK_DIR, { recursive: true });

  const apps = [];
  for (const def of DEFS) apps.push(await buildApp(def));

  const slugToId = new Map(apps.map((a) => [a.slug, a.id]));
  const reviews = REVIEW_SEEDS.map((r) => ({
    id: short("rev"),
    appId: slugToId.get(r.slug),
    author: r.author,
    stars: r.stars,
    title: r.title,
    body: r.body,
    status: "visible",
    createdAt: new Date(Date.now() - Math.random() * 30 * 864e5).toISOString(),
    verifiedPurchase: false,
  }));

  const adminEmail = process.env.BESKAR_ADMIN_EMAIL || "owner@beskar.app";
  const adminPassword = process.env.BESKAR_ADMIN_PASSWORD || "beskar-admin-2024";
  const admins = [
    {
      id: uuid(),
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "superadmin",
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    },
  ];

  const downloads = [];
  for (const a of apps) {
    const n = Math.min(60, Math.floor(a.downloadCount / 400));
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * 14));
      downloads.push({
        id: short("dl"),
        appId: a.id,
        releaseId: a.currentReleaseId,
        createdAt: d.toISOString(),
        kind: a.pricing.model === "paid" ? "entitled" : "free",
      });
    }
  }

  const db = {
    apps,
    reviews,
    orders: [],
    entitlements: [],
    admins,
    audit: [
      {
        id: short("aud"),
        actor: "system",
        action: "seed.init",
        resource: "platform",
        createdAt: new Date().toISOString(),
      },
    ],
    legal: [],
    siteConfig: {
      id: "site",
      maintenanceMode: false,
      maintenanceMessage:
        "BESKAR is undergoing scheduled maintenance. We'll be back shortly.",
      announcement: "New: Atlas Vault 1.2 with breach auditing is now available.",
      announcementEnabled: true,
      heroHeadline: "Engineered software, distributed with intent.",
      heroSubline:
        "A curated catalog of BESKAR applications — verified releases, transparent integrity, precision-built for Android.",
      updatedAt: new Date().toISOString(),
    },
    downloads,
  };

  await fs.writeFile(
    path.join(DATA_DIR, "beskar.json"),
    JSON.stringify(db, null, 2),
    "utf8"
  );

  console.log(`Seeded ${apps.length} apps, ${reviews.length} reviews.`);
  console.log(`Admin: ${adminEmail}  (password from env or default)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
