// ============================================================================
// Firebase Admin SDK bootstrap (server-only).
//
// Lazily initializes a single Admin app from FIREBASE_ADMIN_* service-account
// credentials. All privileged server operations (Firestore writes, Storage
// signed URLs, Auth custom claims) run through the Admin SDK, which bypasses
// security rules — so the browser never has a write path to sensitive data.
//
// If credentials are absent, callers get a clear error instead of a silent
// failure. Nothing here is exposed to the client.
// ============================================================================

import "server-only";
import {
  getApps,
  initializeApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth, type Auth } from "firebase-admin/auth";
import { env } from "../env";

let cachedApp: App | null = null;

export function firebaseConfigured(): boolean {
  const a = env.firebaseAdmin();
  return Boolean(a.projectId && a.clientEmail && a.privateKey);
}

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0];
    return cachedApp;
  }
  const a = env.firebaseAdmin();
  if (!a.projectId || !a.clientEmail || !a.privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }
  cachedApp = initializeApp({
    credential: cert({
      projectId: a.projectId,
      clientEmail: a.clientEmail,
      privateKey: a.privateKey,
    }),
    storageBucket: env.firebaseStorageBucket() || undefined,
  });
  return cachedApp;
}

export function adminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  return db;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminBucket() {
  const bucketName = env.firebaseStorageBucket();
  return getStorage(getAdminApp()).bucket(bucketName || undefined);
}
