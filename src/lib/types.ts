// ============================================================================
// BESKAR — Domain model
// Single source of truth for the shapes flowing through the platform.
// ============================================================================

export type Currency = "USD" | "INR";

export type MonetizationModel = "free" | "freemium" | "paid";

export type PublicationStatus = "draft" | "published" | "unpublished" | "archived";

export type ReviewStatus = "visible" | "hidden" | "reported" | "removed";

export type OrderStatus =
  | "created"
  | "pending"
  | "verifying"
  | "paid"
  | "failed"
  | "refunded";

/** Money is always stored in the base transaction currency (minor units). */
export interface Money {
  /** integer amount in minor units (cents) of `currency` */
  amount: number;
  currency: Currency;
}

export interface Pricing {
  model: MonetizationModel;
  /** current selling price in base currency minor units (0 for free) */
  price: number;
  /** original / MRP in base currency minor units (0 if none) */
  mrp: number;
  /** base transaction currency the amounts are denominated in */
  currency: Currency;
  /** for freemium: describe the in-app premium offering */
  freemiumNote?: string;
  /** true => paid app grants lifetime access */
  lifetime: boolean;
  /** for subscription-style freemium messaging */
  subscriptionNote?: string;
}

export interface Release {
  id: string;
  versionName: string; // e.g. "2.4.1"
  versionCode: number; // monotonically increasing integer
  releaseDate: string; // ISO
  changelog: string;
  /** relative download identifier (controlled endpoint resolves it) */
  apkStorageKey: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  /** true only when an APK signing structure was detected server-side; informational */
  signatureVerified?: boolean;
  minAndroid: string; // e.g. "8.0"
  targetAndroid: string; // e.g. "14"
  status: "published" | "unpublished";
}

export interface AppScreenshot {
  url: string;
  alt: string;
}

export interface RatingSummary {
  count: number;
  average: number; // 0..5, one decimal
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface Application {
  id: string;
  slug: string;
  name: string;
  tagline: string; // short description
  description: string; // full, may contain newlines
  iconUrl: string;
  screenshots: AppScreenshot[];
  category: string;
  features: string[];
  pricing: Pricing;
  releases: Release[];
  currentReleaseId: string | null;
  status: PublicationStatus;
  featured: boolean;
  /** homepage ordering weight (lower = earlier) */
  order: number;
  privacyNote: string;
  permissions: string[];
  developer: string;
  downloadCount: number;
  rating: RatingSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  appId: string;
  author: string;
  stars: number; // 1..5
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  /** true when tied to a verified purchase (future-ready) */
  verifiedPurchase: boolean;
}

export interface Order {
  id: string;
  appId: string;
  appName: string;
  /** amount actually charged, in transaction currency minor units */
  amount: number;
  transactionCurrency: Currency;
  /** currency the buyer was viewing (for record only) */
  displayCurrency: Currency;
  status: OrderStatus;
  provider: "paypal" | "manual";
  providerOrderId: string | null;
  providerCaptureId: string | null;
  /** anonymous entitlement token issued to the buyer's device */
  entitlementToken: string;
  buyerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entitlement {
  id: string;
  token: string; // opaque, given to buyer
  appId: string;
  orderId: string;
  lifetime: boolean;
  createdAt: string;
  revoked: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: "superadmin";
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditEntry {
  id: string;
  actor: string; // admin email or "system"
  action: string; // e.g. "app.publish"
  resource: string; // e.g. "app:atlas-vault"
  before?: unknown;
  after?: unknown;
  ip?: string;
  createdAt: string;
}

export interface LegalDoc {
  id: string; // "terms" | "privacy" | "refund" | "download-notice"
  title: string;
  body: string; // markdown-ish plain text
  updatedAt: string;
}

export interface SiteConfig {
  id: "site";
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcement: string;
  announcementEnabled: boolean;
  heroHeadline: string;
  heroSubline: string;
  updatedAt: string;
}

export interface DownloadEvent {
  id: string;
  appId: string;
  releaseId: string;
  createdAt: string;
  kind: "free" | "entitled";
}

// ---------------------------------------------------------------------------
// Public-facing DTOs (server strips sensitive fields before sending to client)
// ---------------------------------------------------------------------------

export interface PublicRelease {
  versionName: string;
  versionCode: number;
  releaseDate: string;
  changelog: string;
  fileSizeBytes: number;
  sha256: string;
  signatureVerified?: boolean;
  minAndroid: string;
  targetAndroid: string;
}

export interface PricedDisplay {
  model: MonetizationModel;
  lifetime: boolean;
  freemiumNote?: string;
  subscriptionNote?: string;
  transactionCurrency: Currency;
  displayCurrency: Currency;
  /** formatted for display currency */
  price: { minor: number; formatted: string };
  mrp: { minor: number; formatted: string } | null;
  discountPct: number | null;
  /** truthful note when display currency != transaction currency */
  conversionNote: string | null;
}
