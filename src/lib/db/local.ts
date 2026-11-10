// ============================================================================
// Local driver — disk-persisted JSON store implementing Repo.
// Real persistence (survives restarts), atomic-ish writes, and an in-process
// mutex so concurrent API routes don't corrupt the file. This is the driver
// that powers the live preview; it is NOT a mock — every read/write hits disk.
// ============================================================================

import "server-only";
import { promises as fs } from "fs";
import path from "path";
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

interface DBShape {
  apps: Application[];
  reviews: Review[];
  orders: Order[];
  entitlements: Entitlement[];
  admins: AdminUser[];
  audit: AuditEntry[];
  legal: LegalDoc[];
  siteConfig: SiteConfig | null;
  downloads: DownloadEvent[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "beskar.json");

const empty: DBShape = {
  apps: [],
  reviews: [],
  orders: [],
  entitlements: [],
  admins: [],
  audit: [],
  legal: [],
  siteConfig: null,
  downloads: [],
};

// Simple in-process async mutex (Next dev = single node process).
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

let cache: DBShape | null = null;
let loadPromise: Promise<DBShape> | null = null;

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<DBShape> {
  if (cache) return cache;

  // Share initialization across concurrent requests to prevent .tmp rename races.
  if (!loadPromise) {
    loadPromise = (async () => {
      await ensureDir();
      try {
        const raw = await fs.readFile(DB_FILE, "utf8");
        cache = { ...empty, ...(JSON.parse(raw) as DBShape) };
        return cache;
      } catch (error) {
        if ((error as { code?: string }).code !== "ENOENT") throw error;
        const initial = structuredClone(empty);
        await persist(initial);
        return initial;
      }
    })();
  }

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

async function persist(db: DBShape) {
  await ensureDir();
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
  cache = db;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export const localRepo: Repo = {
  // ---- applications ----
  async listApps(opts) {
    const db = await load();
    const list = opts?.includeHidden
      ? db.apps
      : db.apps.filter((a) => a.status === "published");
    return clone(list.sort((a, b) => a.order - b.order));
  },
  async getApp(id) {
    const db = await load();
    return clone(db.apps.find((a) => a.id === id) ?? null);
  },
  async getAppBySlug(slug) {
    const db = await load();
    return clone(db.apps.find((a) => a.slug === slug) ?? null);
  },
  async createApp(app) {
    return withLock(async () => {
      const db = await load();
      db.apps.push(app);
      await persist(db);
      return clone(app);
    });
  },
  async updateApp(id, patch) {
    return withLock(async () => {
      const db = await load();
      const i = db.apps.findIndex((a) => a.id === id);
      if (i === -1) return null;
      db.apps[i] = { ...db.apps[i], ...patch, updatedAt: new Date().toISOString() };
      await persist(db);
      return clone(db.apps[i]);
    });
  },
  async deleteApp(id) {
    return withLock(async () => {
      const db = await load();
      const before = db.apps.length;
      db.apps = db.apps.filter((a) => a.id !== id);
      const changed = db.apps.length !== before;
      if (changed) await persist(db);
      return changed;
    });
  },

  // ---- reviews ----
  async listReviews(opts) {
    const db = await load();
    let list = db.reviews;
    if (opts?.appId) list = list.filter((r) => r.appId === opts.appId);
    if (!opts?.includeHidden)
      list = list.filter((r) => r.status === "visible");
    return clone(
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    );
  },
  async createReview(review) {
    return withLock(async () => {
      const db = await load();
      db.reviews.push(review);
      await persist(db);
      return clone(review);
    });
  },
  async updateReview(id, patch) {
    return withLock(async () => {
      const db = await load();
      const i = db.reviews.findIndex((r) => r.id === id);
      if (i === -1) return null;
      db.reviews[i] = { ...db.reviews[i], ...patch };
      await persist(db);
      return clone(db.reviews[i]);
    });
  },

  // ---- orders & entitlements ----
  async createOrder(order) {
    return withLock(async () => {
      const db = await load();
      db.orders.push(order);
      await persist(db);
      return clone(order);
    });
  },
  async getOrder(id) {
    const db = await load();
    return clone(db.orders.find((o) => o.id === id) ?? null);
  },
  async updateOrder(id, patch) {
    return withLock(async () => {
      const db = await load();
      const i = db.orders.findIndex((o) => o.id === id);
      if (i === -1) return null;
      db.orders[i] = {
        ...db.orders[i],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await persist(db);
      return clone(db.orders[i]);
    });
  },
  async listOrders() {
    const db = await load();
    return clone(
      [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    );
  },
  async createEntitlement(e) {
    return withLock(async () => {
      const db = await load();
      db.entitlements.push(e);
      await persist(db);
      return clone(e);
    });
  },
  async getEntitlementByToken(token) {
    const db = await load();
    return clone(db.entitlements.find((e) => e.token === token) ?? null);
  },

  // ---- admin ----
  async getAdminById(id) {
    const db = await load();
    return clone(db.admins.find((a) => a.id === id) ?? null);
  },
  async getAdminByEmail(email) {
    const db = await load();
    return clone(
      db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase()) ??
        null
    );
  },
  async createAdmin(a) {
    return withLock(async () => {
      const db = await load();
      db.admins.push(a);
      await persist(db);
      return clone(a);
    });
  },
  async updateAdmin(id, patch) {
    return withLock(async () => {
      const db = await load();
      const i = db.admins.findIndex((a) => a.id === id);
      if (i === -1) return null;
      db.admins[i] = { ...db.admins[i], ...patch };
      await persist(db);
      return clone(db.admins[i]);
    });
  },
  async countAdmins() {
    const db = await load();
    return db.admins.length;
  },

  // ---- audit ----
  async addAudit(a) {
    await withLock(async () => {
      const db = await load();
      db.audit.push(a);
      if (db.audit.length > 5000) db.audit = db.audit.slice(-5000);
      await persist(db);
    });
  },
  async listAudit(limit = 200) {
    const db = await load();
    return clone(
      [...db.audit]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit)
    );
  },

  // ---- legal & config ----
  async getLegal(id) {
    const db = await load();
    return clone(db.legal.find((l) => l.id === id) ?? null);
  },
  async listLegal() {
    const db = await load();
    return clone(db.legal);
  },
  async upsertLegal(doc) {
    return withLock(async () => {
      const db = await load();
      const i = db.legal.findIndex((l) => l.id === doc.id);
      if (i === -1) db.legal.push(doc);
      else db.legal[i] = doc;
      await persist(db);
      return clone(doc);
    });
  },
  async getSiteConfig() {
    const db = await load();
    if (!db.siteConfig) {
      const def: SiteConfig = {
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
      await withLock(async () => {
        const d = await load();
        d.siteConfig = def;
        await persist(d);
      });
      return clone(def);
    }
    return clone(db.siteConfig);
  },
  async updateSiteConfig(patch) {
    return withLock(async () => {
      const db = await load();
      const current = db.siteConfig ?? (await this.getSiteConfig());
      db.siteConfig = {
        ...current,
        ...patch,
        id: "site",
        updatedAt: new Date().toISOString(),
      };
      await persist(db);
      return clone(db.siteConfig);
    });
  },

  // ---- analytics ----
  async addDownload(e) {
    await withLock(async () => {
      const db = await load();
      db.downloads.push(e);
      if (db.downloads.length > 50000) db.downloads = db.downloads.slice(-50000);
      await persist(db);
    });
  },
  async incrementDownloadCount(appId) {
    await withLock(async () => {
      const db = await load();
      const app = db.apps.find((a) => a.id === appId);
      if (!app) return;
      app.downloadCount += 1;
      app.updatedAt = new Date().toISOString();
      await persist(db);
    });
  },
  async listDownloads() {
    const db = await load();
    return clone(db.downloads);
  },
};
