import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repo } from "@/lib/db";
import { toPublicApp } from "@/lib/services/apps";
import { env } from "@/lib/env";
import AppDetail from "@/components/AppDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const app = await repo.getAppBySlug(params.slug);
  if (!app || app.status !== "published") {
    return { title: "Application not found" };
  }
  const url = `${env.siteUrl()}/apps/${app.slug}`;
  return {
    title: app.name,
    description: app.tagline,
    alternates: { canonical: url },
    openGraph: {
      title: app.name,
      description: app.tagline,
      url,
      images: [{ url: app.iconUrl }],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: app.name,
      description: app.tagline,
      images: [app.iconUrl],
    },
  };
}

export default async function AppPage({
  params,
}: {
  params: { slug: string };
}) {
  const app = await repo.getAppBySlug(params.slug);
  if (!app || app.status !== "published") notFound();

  // Server default to base currency; the client re-fetches for the buyer's pick.
  const dto = toPublicApp(app, env.baseCurrency());
  const rel = dto.currentRelease;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.tagline,
    applicationCategory: app.category,
    operatingSystem: rel ? `Android ${rel.minAndroid}+` : "Android",
    softwareVersion: rel?.versionName,
    datePublished: rel?.releaseDate,
    offers: {
      "@type": "Offer",
      price: (app.pricing.price / 100).toFixed(2),
      priceCurrency: app.pricing.currency,
      availability: "https://schema.org/InStock",
    },
    ...(app.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: app.rating.average,
            reviewCount: app.rating.count,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppDetail initial={dto} />
    </>
  );
}
