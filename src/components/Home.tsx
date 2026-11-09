"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { useCurrency } from "@/lib/client/currency";
import type { PublicApp } from "@/lib/services/apps";
import AppCard from "./AppCard";
import { Reveal, Spinner } from "./ui";

export default function Home({
  heroHeadline,
  heroSubline,
}: {
  heroHeadline: string;
  heroSubline: string;
}) {
  const { currency } = useCurrency();
  const [apps, setApps] = useState<PublicApp[] | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<PublicApp[]>(`/api/apps?currency=${currency}`)
      .then((d) => active && setApps(d))
      .catch(() => active && setApps([]));
    return () => {
      active = false;
    };
  }, [currency]);

  const featured = apps?.filter((a) => a.featured).slice(0, 3) ?? [];
  const newest =
    apps
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.currentRelease?.releaseDate ?? b.updatedAt).getTime() -
          new Date(a.currentRelease?.releaseDate ?? a.updatedAt).getTime()
      )
      .slice(0, 6) ?? [];

  const totalDownloads =
    apps?.reduce((s, a) => s + a.downloadCount, 0) ?? 0;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <div className="relative mx-auto mb-10 h-32 w-32 sm:h-40 sm:w-40">
                <div className="absolute inset-0 rounded-full bg-titanium-100/5 blur-3xl" />
                <Image
                  src="/brand/beskar-mark.png"
                  alt="BESKAR"
                  fill
                  priority
                  className="object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
                />
              </div>
            </Reveal>
            <Reveal delay={80}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] uppercase tracking-wider2 text-titanium-300">
                Official BESKAR Distribution
              </span>
            </Reveal>
            <Reveal delay={140}>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-titanium-100 sm:text-6xl">
                <span className="titanium-text">{heroHeadline}</span>
              </h1>
            </Reveal>
            <Reveal delay={220}>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-titanium-400 sm:text-lg">
                {heroSubline}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/apps" className="btn-primary px-7 py-3 text-sm">
                  Explore applications
                </Link>
                <Link href="/trust" className="btn-ghost px-7 py-3 text-sm">
                  How we verify releases
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Signal strip */}
          <Reveal delay={380}>
            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
              <Stat label="Applications" value={apps ? String(apps.length) : "—"} />
              <Stat
                label="Total downloads"
                value={apps ? totalDownloads.toLocaleString() : "—"}
              />
              <Stat label="SHA-256 verified" value="Every release" />
              <Stat label="Currencies" value="USD · INR" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Featured"
          title="Curated by BESKAR"
          href="/apps"
          linkLabel="View all"
        />
        {!apps ? (
          <LoadingRow />
        ) : featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a, i) => (
              <Reveal key={a.id} delay={i * 70}>
                <AppCard app={a} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyRow label="Featured applications will appear here." />
        )}
      </section>

      {/* VALUE PILLARS */}
      <section className="mx-auto mt-28 max-w-7xl px-5 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <div className="glass h-full rounded-2xl p-7">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-titanium-100">
                  {p.icon}
                </div>
                <h3 className="text-lg font-semibold text-titanium-100">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-titanium-400">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* NEW RELEASES */}
      <section className="mx-auto mt-28 max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Recently updated"
          title="New & updated releases"
          href="/apps?sort=new"
          linkLabel="See all"
        />
        {!apps ? (
          <LoadingRow />
        ) : newest.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {newest.map((a, i) => (
              <Reveal key={a.id} delay={i * 60}>
                <AppCard app={a} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyRow label="New releases will appear here." />
        )}
      </section>

      {/* CLOSING */}
      <section className="mx-auto mt-28 max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
            <div className="bg-radial-glow pointer-events-none absolute inset-0" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-titanium-100 sm:text-4xl">
              <span className="titanium-text">Software, delivered with intent.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-titanium-400">
              Transparent integrity, honest pricing, and a download experience
              engineered to earn your trust.
            </p>
            <div className="relative mt-8">
              <Link href="/apps" className="btn-primary px-7 py-3 text-sm">
                Browse the catalog
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-void/40 px-5 py-6 text-center">
      <div className="text-xl font-semibold text-titanium-100">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider2 text-titanium-500">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <span className="text-[11px] uppercase tracking-wider2 text-titanium-500">
          {eyebrow}
        </span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-titanium-100 sm:text-3xl">
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="hidden text-sm text-titanium-400 transition-colors hover:text-titanium-100 sm:inline-flex"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-48 rounded-2xl">
          <div className="skeleton h-full w-full rounded-2xl opacity-40" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="glass rounded-2xl px-8 py-14 text-center text-sm text-titanium-400">
      {label}
    </div>
  );
}

const PILLARS = [
  {
    title: "Integrity-checked releases",
    body: "Every build carries a server-computed SHA-256 checksum, version metadata, and a complete release history you can inspect before installing.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Honest pricing",
    body: "Display prices in USD or INR. We clearly separate the currency you view from the currency payment settles in — no misleading conversions.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14.5 9.2c-.5-1-1.5-1.5-2.6-1.5-1.5 0-2.6.9-2.6 2.1 0 2.7 5.4 1.4 5.4 4.2 0 1.3-1.2 2.2-2.8 2.2-1.3 0-2.4-.6-2.9-1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "No dark patterns",
    body: "No intrusive ads, no fake buttons, no spam. A clean, deliberate download flow that respects your attention and your device.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 12l2.3 2.3L15.8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];
