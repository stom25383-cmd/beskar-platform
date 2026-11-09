import type { MetadataRoute } from "next";
import { repo } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl();
  const apps = await repo.listApps({ includeHidden: false });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/apps`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/trust`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/refund`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${base}/legal/download-notice`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const appRoutes: MetadataRoute.Sitemap = apps.map((a) => ({
    url: `${base}/apps/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...appRoutes];
}
