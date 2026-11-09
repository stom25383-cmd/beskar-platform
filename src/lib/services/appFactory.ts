import "server-only";
import type { Application } from "../types";
import type { AppInput } from "../db/schema";
import { uuid } from "../ids";

export function buildApp(input: AppInput): Application {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    slug: input.slug,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    iconUrl: input.iconUrl,
    screenshots: input.screenshots,
    category: input.category,
    features: input.features,
    pricing: input.pricing,
    releases: [],
    currentReleaseId: null,
    status: input.status,
    featured: input.featured,
    order: input.order,
    privacyNote: input.privacyNote,
    permissions: input.permissions,
    developer: input.developer || "BESKAR",
    downloadCount: 0,
    rating: {
      count: 0,
      average: 0,
      distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    },
    createdAt: now,
    updatedAt: now,
  };
}
