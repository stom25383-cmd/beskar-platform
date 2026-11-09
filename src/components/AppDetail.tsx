"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { useCurrency } from "@/lib/client/currency";
import type { PublicApp } from "@/lib/services/apps";
import { Badge, Stars, Spinner } from "./ui";
import DownloadPanel from "./DownloadPanel";
import ReviewSection from "./ReviewSection";
import { formatBytes } from "@/lib/money";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AppDetail({ initial }: { initial: PublicApp }) {
  const { currency } = useCurrency();
  const [app, setApp] = useState<PublicApp>(initial);
  const [activeShot, setActiveShot] = useState(0);
  const [tab, setTab] = useState<"overview" | "releases" | "integrity">(
    "overview"
  );

  // Re-fetch when the buyer changes their display currency (prices update).
  useEffect(() => {
    let active = true;
    apiGet<PublicApp>(`/api/apps/${initial.slug}?currency=${currency}`)
      .then((d) => active && setApp(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currency, initial.slug]);

  const rel = app.currentRelease;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-graphite-800 sm:h-28 sm:w-28">
          <Image src={app.iconUrl} alt="" fill sizes="112px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ModelBadge app={app} />
            {app.currentRelease?.signatureVerified && <Badge tone="accent">Verified</Badge>}
            <Badge tone="neutral">{app.category}</Badge>
            {app.featured && <Badge tone="accent">Featured</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-titanium-100 sm:text-4xl">
            {app.name}
          </h1>
          <p className="mt-2 max-w-2xl text-titanium-400">{app.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-titanium-400">
            {app.rating.count > 0 ? (
              <Stars value={app.rating.average} count={app.rating.count} />
            ) : (
              <span className="text-titanium-500/70">No ratings yet</span>
            )}
            <span>{app.downloadCount.toLocaleString()} downloads</span>
            <span>By {app.developer}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="order-2 lg:order-1">
          {/* Screenshots */}
          {app.screenshots.length > 0 && (
            <section className="mb-10">
              <div className="glass overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/10] w-full bg-graphite-900">
                  <Image
                    src={app.screenshots[activeShot]?.url}
                    alt={app.screenshots[activeShot]?.alt || app.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 700px"
                    className="object-contain"
                  />
                </div>
              </div>
              {app.screenshots.length > 1 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {app.screenshots.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveShot(i)}
                      aria-label={`View screenshot ${i + 1}`}
                      className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border ${
                        i === activeShot
                          ? "border-titanium-200"
                          : "border-white/10 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={s.url} alt="" fill sizes="112px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b border-white/[0.06]">
            {(
              [
                ["overview", "Overview"],
                ["releases", "Release history"],
                ["integrity", "Integrity & privacy"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-4 py-3 text-sm transition-colors ${
                  tab === key
                    ? "text-titanium-100"
                    : "text-titanium-400 hover:text-titanium-200"
                }`}
              >
                {label}
                {tab === key && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-titanium-100" />
                )}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-10">
              <section>
                <p className="whitespace-pre-line leading-relaxed text-titanium-300">
                  {app.description}
                </p>
              </section>

              {app.features.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-titanium-100">
                    Features
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {app.features.map((f) => (
                      <li
                        key={f}
                        className="glass flex items-start gap-3 rounded-xl p-4 text-sm text-titanium-300"
                      >
                        <svg
                          className="mt-0.5 shrink-0 text-titanium-200"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M5 12l4.5 4.5L19 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {app.price.model === "freemium" && app.price.freemiumNote && (
                <section className="glass rounded-2xl p-6">
                  <h2 className="text-base font-semibold text-titanium-100">
                    What&apos;s in the premium tier
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-titanium-400">
                    {app.price.freemiumNote}
                  </p>
                </section>
              )}
            </div>
          )}

          {tab === "releases" && (
            <div className="space-y-4">
              {app.releaseHistory.length === 0 && (
                <p className="text-titanium-400">No published releases yet.</p>
              )}
              {app.releaseHistory.map((r, i) => (
                <div key={r.versionCode} className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-titanium-100">
                        v{r.versionName}
                      </span>
                      {i === 0 && <Badge tone="accent">Current</Badge>}
                    </div>
                    <span className="text-sm text-titanium-400">
                      {fmtDate(r.releaseDate)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-titanium-400">
                    {r.changelog || "No changelog provided."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-titanium-500">
                    <span>Size {formatBytes(r.fileSizeBytes)}</span>
                    <span>Android {r.minAndroid}+</span>
                    <span>Target {r.targetAndroid}</span>
                    <span>Build {r.versionCode}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "integrity" && (
            <div className="space-y-6">
              <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold text-titanium-100">
                  Release integrity
                </h2>
                <p className="mt-2 text-sm text-titanium-400">
                  BESKAR publishes verifiable facts about each release. We do
                  not make unverifiable safety guarantees.
                </p>
                {rel ? (
                  <dl className="mt-5 space-y-3 text-sm">
                    <Row label="Version">
                      v{rel.versionName} (build {rel.versionCode})
                    </Row>
                    <Row label="Released">{fmtDate(rel.releaseDate)}</Row>
                    <Row label="Package size">
                      {formatBytes(rel.fileSizeBytes)}
                    </Row>
                    <Row label="Min. Android">{rel.minAndroid}+</Row>
                    <div>
                      <dt className="text-titanium-500">SHA-256 checksum</dt>
                      <dd className="mt-1 break-all rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-titanium-300">
                        {rel.sha256}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-titanium-500">
                    No published release available.
                  </p>
                )}
              </section>

              {app.permissions.length > 0 && (
                <section className="glass rounded-2xl p-6">
                  <h2 className="text-base font-semibold text-titanium-100">
                    Permissions requested
                  </h2>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {app.permissions.map((p) => (
                      <li
                        key={p}
                        className="text-sm text-titanium-400"
                      >
                        · {p}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {app.privacyNote && (
                <section className="glass rounded-2xl p-6">
                  <h2 className="text-base font-semibold text-titanium-100">
                    Privacy
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-titanium-400">
                    {app.privacyNote}
                  </p>
                </section>
              )}
            </div>
          )}

          <ReviewSection slug={app.slug} rating={app.rating} />
        </div>

        {/* RIGHT — sticky purchase/download */}
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <DownloadPanel app={app} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-titanium-500">{label}</dt>
      <dd className="text-titanium-200">{children}</dd>
    </div>
  );
}

function ModelBadge({ app }: { app: PublicApp }) {
  if (app.price.model === "free") return <Badge tone="free">Free</Badge>;
  if (app.price.model === "freemium") return <Badge tone="freemium">Freemium</Badge>;
  return <Badge tone="paid">{app.price.lifetime ? "Lifetime" : "Paid"}</Badge>;
}
