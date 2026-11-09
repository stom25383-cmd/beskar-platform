// ============================================================================
// Firebase driver — production implementation of Repo backed by Firestore.
//
// Activated by BESKAR_DRIVER=firebase + FIREBASE_ADMIN_* service-account vars.
// All access here uses the Admin SDK, which bypasses security rules; the rules
// in firebase/firestore.rules exist to constrain any *client* SDK access.
//
// Collection layout (documented data model):
//   apps/{appId}            -> Application (releases embedded for read speed)
//   reviews/{reviewId}      -> Review        (indexed by appId, status)
//   orders/{orderId}        -> Order         (admin-only read)
//   entitlements/{entId}    -> Entitlement   (server-only; indexed by token)
//   admins/{adminId}        -> AdminUser
//   audit/{autoId}          -> AuditEntry
//   legal/{docId}           -> LegalDoc
//   config/site             -> SiteConfig
//   downloads/{autoId}      -> DownloadEvent (server-only write)
// ============================================================================

import "server-only";
import type { Repo } from "./repo";
import type {
  Application,
  Review,
  Order,
  Entitlement,
  AdminUser,
  AuditEntry,
  LegalDoc,
  SiteConfig,
  DownloadEvent,
} from "../types";
import { adminDb } from "../firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const COL = {
  apps: "apps",
  reviews: "reviews",
  orders: "orders",
  entitlements: "entitlements",
  admins: "admins",
  audit: "audit",
  legal: "legal",
  config: "config",
  downloads: "downloads",
} as const;

function stripId<T extends { id?: string }>(o: T): Omit<T, "id"> {
  const { id, ...rest } = o;
  return rest;
}

const DEFAULT_SITE_CONFIG: SiteConfig = {
  id: "site",
  maintenanceMode: false,
  maintenanceMessage:
    "BESKAR is undergoing scheduled maintenance. We'll be back shortly.",
  announcement: "",
  announcementEnabled: false,
  heroHeadline: "Engineered software, distributed with intent.",
  heroSubline:
    "A curated catalog of BESKAR applications — integrity-checked releases, transparent integrity, precision-built for Android.",
  updatedAt: new Date().toISOString(),
};

export const firebaseRepo: Repo = {
  // ---- applications ----
  async listApps(opts) {
    const db = adminDb();
    let q = db.collection(COL.apps).orderBy("order", "asc");
    if (!opts?.includeHidden) {
      q = db
        .collection(COL.apps)
        .where("status", "==", "published")
        .orderBy("order", "asc");
    }
    const snap = await q.get();
    return snap.docs.map((d) => d.data() as Application);
  },

  async getApp(id) {
    const doc = await adminDb().collection(COL.apps).doc(id).get();
    return doc.exists ? (doc.data() as Application) : null;
  },

  async getAppBySlug(slug) {
    const snap = await adminDb()
      .collection(COL.apps)
      .where("slug", "==", slug)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as Application);
  },

  async createApp(app) {
    await adminDb().collection(COL.apps).doc(app.id).set(app);
    return app;
  },

  async updateApp(id, patch) {
    const ref = adminDb().collection(COL.apps).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const updated = {
      ...(doc.data() as Application),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated);
    return updated;
  },

  async deleteApp(id) {
    const ref = adminDb().collection(COL.apps).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  },

  // ---- reviews ----
  async listReviews(opts) {
    const db = adminDb();
    let ref = db.collection(COL.reviews) as FirebaseFirestore.Query;
    if (opts?.appId) ref = ref.where("appId", "==", opts.appId);
    if (!opts?.includeHidden) ref = ref.where("status", "==", "visible");
    const snap = await ref.get();
    const items = snap.docs.map((d) => d.data() as Review);
    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async createReview(review) {
    await adminDb().collection(COL.reviews).doc(review.id).set(review);
    return review;
  },

  async updateReview(id, patch) {
    const ref = adminDb().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const updated = { ...(doc.data() as Review), ...patch };
    await ref.set(updated);
    return updated;
  },

  // ---- orders & entitlements ----
  async createOrder(order) {
    await adminDb().collection(COL.orders).doc(order.id).set(order);
    return order;
  },

  async getOrder(id) {
    const doc = await adminDb().collection(COL.orders).doc(id).get();
    return doc.exists ? (doc.data() as Order) : null;
  },

  async updateOrder(id, patch) {
    const ref = adminDb().collection(COL.orders).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const updated = {
      ...(doc.data() as Order),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated);
    return updated;
  },

  async listOrders() {
    const snap = await adminDb()
      .collection(COL.orders)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => d.data() as Order);
  },

  async createEntitlement(e) {
    await adminDb().collection(COL.entitlements).doc(e.id).set(e);
    return e;
  },

  async getEntitlementByToken(token) {
    const snap = await adminDb()
      .collection(COL.entitlements)
      .where("token", "==", token)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as Entitlement);
  },

  // ---- admin ----
  async getAdminById(id) {
    const doc = await adminDb().collection(COL.admins).doc(id).get();
    return doc.exists ? (doc.data() as AdminUser) : null;
  },
  async getAdminByEmail(email) {
    const snap = await adminDb()
      .collection(COL.admins)
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as AdminUser);
  },

  async createAdmin(a) {
    await adminDb()
      .collection(COL.admins)
      .doc(a.id)
      .set({ ...a, email: a.email.toLowerCase() });
    return a;
  },

  async updateAdmin(id, patch) {
    const ref = adminDb().collection(COL.admins).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const updated = { ...(doc.data() as AdminUser), ...patch };
    await ref.set(updated);
    return updated;
  },

  async countAdmins() {
    const snap = await adminDb().collection(COL.admins).count().get();
    return snap.data().count;
  },

  // ---- audit ----
  async addAudit(a) {
    await adminDb().collection(COL.audit).doc(a.id).set(a);
  },

  async listAudit(limit = 200) {
    const snap = await adminDb()
      .collection(COL.audit)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as AuditEntry);
  },

  // ---- legal & config ----
  async getLegal(id) {
    const doc = await adminDb().collection(COL.legal).doc(id).get();
    return doc.exists ? (doc.data() as LegalDoc) : null;
  },

  async listLegal() {
    const snap = await adminDb().collection(COL.legal).get();
    return snap.docs.map((d) => d.data() as LegalDoc);
  },

  async upsertLegal(doc) {
    await adminDb().collection(COL.legal).doc(doc.id).set(doc);
    return doc;
  },

  async getSiteConfig() {
    const ref = adminDb().collection(COL.config).doc("site");
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set(DEFAULT_SITE_CONFIG);
      return DEFAULT_SITE_CONFIG;
    }
    return doc.data() as SiteConfig;
  },

  async updateSiteConfig(patch) {
    const ref = adminDb().collection(COL.config).doc("site");
    const doc = await ref.get();
    const current = doc.exists ? (doc.data() as SiteConfig) : DEFAULT_SITE_CONFIG;
    const updated: SiteConfig = {
      ...current,
      ...patch,
      id: "site",
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated);
    return updated;
  },

  // ---- analytics ----
  async addDownload(e) {
    await adminDb().collection(COL.downloads).doc(e.id).set(e);
  },

  async incrementDownloadCount(appId) {
    await adminDb().collection(COL.apps).doc(appId).update({
      downloadCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });
  },
  async listDownloads() {
    const snap = await adminDb()
      .collection(COL.downloads)
      .orderBy("createdAt", "desc")
      .limit(5000)
      .get();
    return snap.docs.map((d) => d.data() as DownloadEvent);
  },
};

// Note: `stripId` and `FieldValue` are available for callers that later need
// server timestamps / partial field updates without full-document rewrites.
void stripId;
void FieldValue;
