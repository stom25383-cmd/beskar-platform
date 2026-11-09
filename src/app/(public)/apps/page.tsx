import { Suspense } from "react";
import type { Metadata } from "next";
import Catalog from "@/components/Catalog";

export const metadata: Metadata = {
  title: "Applications",
  description:
    "Browse the full catalog of BESKAR Android applications — free, freemium, and lifetime titles with transparent releases.",
};

export default function AppsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <header className="mb-10">
        <span className="text-[11px] uppercase tracking-wider2 text-titanium-500">
          Catalog
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-titanium-100 sm:text-4xl">
          BESKAR Applications
        </h1>
        <p className="mt-3 max-w-2xl text-titanium-400">
          Every application here is created and approved by BESKAR. Search,
          filter, and explore — each carries transparent release and integrity
          details.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="py-20 text-center text-titanium-400">Loading…</div>
        }
      >
        <Catalog />
      </Suspense>
    </div>
  );
}
