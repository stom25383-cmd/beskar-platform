// ============================================================================
// Seed Firestore + Cloud Storage from the local demo dataset.
//
// Prereqs:
//   1. npm run seed            (generates data/beskar.json + public/apks/*)
//   2. Set FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY and
//      FIREBASE_STORAGE_BUCKET in your environment (or .env.local).
//   3. node scripts/seed-firebase.mjs
//
// This uploads APK binaries (private) and media images (public) to Storage,
// rewrites the storage keys / icon URLs accordingly, and writes all documents
// to Firestore. Idempotent per document id (uses set()).
//
// It reads .env.local if present (no extra dependency needed).
// ============================================================================

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = process.cwd();

// --- tiny .env.local loader (no dotenv dependency) ---
async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        let v = m[2];
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {
    /* no .env.local — rely on process env */
  }
}

async function main() {
  await loadEnv();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing FIREBASE_ADMIN_* credentials. Set them in .env.local or the environment."
    );
    process.exit(1);
  }

  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getStorage } = await import("firebase-admin/storage");

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: bucketName,
  });
  const db = getFirestore(app);
  const bucket = bucketName ? getStorage(app).bucket(bucketName) : null;

  const dbFile = path.join(ROOT, "data", "beskar.json");
  const data = JSON.parse(await fs.readFile(dbFile, "utf8"));

  // Upload media (public) and rewrite icon/screenshot URLs.
  const mediaMap = new Map();
  async function uploadMediaByUrl(url) {
    if (!url || !url.startsWith("/media/")) return url;
    if (mediaMap.has(url)) return mediaMap.get(url);
    if (!bucket) return url;
    const fileName = url.replace("/media/", "");
    const local = path.join(ROOT, "public", "media", fileName);
    try {
      const buf = await fs.readFile(local);
      const dest = bucket.file(`media/${fileName}`);
      const contentType = fileName.endsWith(".png")
        ? "image/png"
        : fileName.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
      await dest.save(buf, {
        resumable: false,
        contentType,
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      await dest.makePublic();
      const publicUrl = dest.publicUrl();
      mediaMap.set(url, publicUrl);
      return publicUrl;
    } catch (e) {
      console.warn(`  ! could not upload media ${fileName}: ${e.message}`);
      return url;
    }
  }

  // Upload APKs (private) — keep the same storage key.
  async function uploadApk(key) {
    if (!bucket) return;
    const local = path.join(ROOT, "public", "apks", key);
    try {
      const buf = await fs.readFile(local);
      await bucket.file(`apks/${key}`).save(buf, {
        resumable: false,
        contentType: "application/vnd.android.package-archive",
        metadata: { cacheControl: "private, no-store" },
      });
    } catch (e) {
      console.warn(`  ! could not upload apk ${key}: ${e.message}`);
    }
  }

  console.log("Uploading assets & writing Firestore documents…");

  for (const appDoc of data.apps) {
    appDoc.iconUrl = await uploadMediaByUrl(appDoc.iconUrl);
    if (Array.isArray(appDoc.screenshots)) {
      for (const s of appDoc.screenshots) {
        s.url = await uploadMediaByUrl(s.url);
      }
    }
    for (const rel of appDoc.releases || []) {
      await uploadApk(rel.apkStorageKey);
    }
    await db.collection("apps").doc(appDoc.id).set(appDoc);
  }
  console.log(`  apps: ${data.apps.length}`);

  for (const r of data.reviews || []) await db.collection("reviews").doc(r.id).set(r);
  console.log(`  reviews: ${(data.reviews || []).length}`);

  for (const a of data.admins || [])
    await db.collection("admins").doc(a.id).set({ ...a, email: a.email.toLowerCase() });
  console.log(`  admins: ${(data.admins || []).length}`);

  for (const l of data.legal || []) await db.collection("legal").doc(l.id).set(l);
  if (data.siteConfig) await db.collection("config").doc("site").set(data.siteConfig);

  for (const d of data.downloads || [])
    await db.collection("downloads").doc(d.id).set(d);
  console.log(`  downloads: ${(data.downloads || []).length}`);

  for (const a of data.audit || []) await db.collection("audit").doc(a.id).set(a);

  console.log("\nDone. Firestore + Storage seeded.");
  console.log(
    "Remember to set a Super Admin custom claim if you use Firebase Auth for admin login."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

void fileURLToPath;
