// ============================================================================
// Repository interface — the seam between business logic and storage.
// The local driver (disk JSON) and the firebase driver both implement this.
// Swapping BESKAR_DRIVER changes the implementation with zero call-site edits.
// ============================================================================

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

export interface Repo {
  // --- applications ---
  listApps(opts?: { includeHidden?: boolean }): Promise<Application[]>;
  getApp(id: string): Promise<Application | null>;
  getAppBySlug(slug: string): Promise<Application | null>;
  createApp(app: Application): Promise<Application>;
  updateApp(id: string, patch: Partial<Application>): Promise<Application | null>;
  deleteApp(id: string): Promise<boolean>;

  // --- reviews ---
  listReviews(opts?: {
    appId?: string;
    includeHidden?: boolean;
  }): Promise<Review[]>;
  createReview(review: Review): Promise<Review>;
  updateReview(id: string, patch: Partial<Review>): Promise<Review | null>;

  // --- orders & entitlements ---
  createOrder(order: Order): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order | null>;
  listOrders(): Promise<Order[]>;
  createEntitlement(e: Entitlement): Promise<Entitlement>;
  getEntitlementByToken(token: string): Promise<Entitlement | null>;

  // --- admin ---
  getAdminByEmail(email: string): Promise<AdminUser | null>;
  getAdminById(id: string): Promise<AdminUser | null>;
  createAdmin(a: AdminUser): Promise<AdminUser>;
  updateAdmin(id: string, patch: Partial<AdminUser>): Promise<AdminUser | null>;
  countAdmins(): Promise<number>;

  // --- audit ---
  addAudit(a: AuditEntry): Promise<void>;
  listAudit(limit?: number): Promise<AuditEntry[]>;

  // --- legal & config ---
  getLegal(id: string): Promise<LegalDoc | null>;
  listLegal(): Promise<LegalDoc[]>;
  upsertLegal(doc: LegalDoc): Promise<LegalDoc>;
  getSiteConfig(): Promise<SiteConfig>;
  updateSiteConfig(patch: Partial<SiteConfig>): Promise<SiteConfig>;

  // --- analytics ---
  addDownload(e: DownloadEvent): Promise<void>;
  incrementDownloadCount(appId: string): Promise<void>;
  listDownloads(): Promise<DownloadEvent[]>;
}
