import "server-only";
import { repo } from "../db";
import { env } from "../env";
import { priceForDisplay } from "../money";
import type {
  Application,
  Currency,
  PublicRelease,
  PricedDisplay,
} from "../types";

/** Strip a release down to public-safe fields (no storage keys). */
export function toPublicRelease(app: Application): PublicRelease | null {
  const rel =
    app.releases.find((r) => r.id === app.currentReleaseId) ??
    app.releases.find((r) => r.status === "published") ??
    null;
  if (!rel) return null;
  return {
    versionName: rel.versionName,
    versionCode: rel.versionCode,
    releaseDate: rel.releaseDate,
    changelog: rel.changelog,
    fileSizeBytes: rel.fileSizeBytes,
    sha256: rel.sha256,
    signatureVerified: rel.signatureVerified || undefined,
    minAndroid: rel.minAndroid,
    targetAndroid: rel.targetAndroid,
  };
}

export function priceView(
  app: Application,
  displayCurrency: Currency
): PricedDisplay {
  return priceForDisplay(app.pricing, displayCurrency, env.fx());
}

export interface PublicApp {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  iconUrl: string;
  screenshots: { url: string; alt: string }[];
  category: string;
  features: string[];
  developer: string;
  privacyNote: string;
  permissions: string[];
  downloadCount: number;
  rating: Application["rating"];
  featured: boolean;
  currentRelease: PublicRelease | null;
  releaseHistory: PublicRelease[];
  price: PricedDisplay;
  updatedAt: string;
}

/** Map an Application to the DTO sent to browsers. */
export function toPublicApp(
  app: Application,
  displayCurrency: Currency
): PublicApp {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    tagline: app.tagline,
    description: app.description,
    iconUrl: app.iconUrl,
    screenshots: app.screenshots,
    category: app.category,
    features: app.features,
    developer: app.developer,
    privacyNote: app.privacyNote,
    permissions: app.permissions,
    downloadCount: app.downloadCount,
    rating: app.rating,
    featured: app.featured,
    currentRelease: toPublicRelease(app),
    releaseHistory: app.releases
      .filter((r) => r.status === "published")
      .sort((a, b) => b.versionCode - a.versionCode)
      .map((r) => ({
        versionName: r.versionName,
        versionCode: r.versionCode,
        releaseDate: r.releaseDate,
        changelog: r.changelog,
        fileSizeBytes: r.fileSizeBytes,
        sha256: r.sha256,
        signatureVerified: r.signatureVerified || undefined,
        minAndroid: r.minAndroid,
        targetAndroid: r.targetAndroid,
      })),
    price: priceView(app, displayCurrency),
    updatedAt: app.updatedAt,
  };
}

export async function getPublishedApps(): Promise<Application[]> {
  return repo.listApps({ includeHidden: false });
}
