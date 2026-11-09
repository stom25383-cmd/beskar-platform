"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/client/api";
import { useCurrency } from "@/lib/client/currency";
import type { PublicApp } from "@/lib/services/apps";
import AppCard from "./AppCard";
import { Spinner } from "./ui";

type SortKey = "featured" | "new" | "popular" | "rating" | "price-asc" | "price-desc";
type FilterKey = "all" | "free" | "paid" | "freemium";

export default function Catalog() {
  const { currency } = useCurrency();
  const searchParams = useSearchParams();
  const [apps, setApps] = useState<PublicApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get("sort") as SortKey) || "featured"
  );
  const [filter, setFilter] = useState<FilterKey>(
    (searchParams.get("filter") as FilterKey) || "all"
  );
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    let active = true;
    setApps(null);
    setError(null);
    apiGet<PublicApp[]>(`/api/apps?currency=${currency}`)
      .then((data) => active && setApps(data))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [currency]);

  const categories = useMemo(() => {
    if (!apps) return [];
    return Array.from(new Set(apps.map((a) => a.category))).sort();
  }, [apps]);

  const filtered = useMemo(() => {
    if (!apps) return [];
    let list = [...apps];
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(needle) ||
          a.tagline.toLowerCase().includes(needle) ||
          a.category.toLowerCase().includes(needle) ||
          a.features.some((f) => f.toLowerCase().includes(needle))
      );
    }
    if (filter !== "all") list = list.filter((a) => a.price.model === filter);
    if (category !== "all") list = list.filter((a) => a.category === category);

    switch (sort) {
      case "new":
        list.sort(
          (a, b) =>
            new Date(b.currentRelease?.releaseDate ?? b.updatedAt).getTime() -
            new Date(a.currentRelease?.releaseDate ?? a.updatedAt).getTime()
        );
        break;
      case "popular":
        list.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case "rating":
        list.sort((a, b) => b.rating.average - a.rating.average);
        break;
      case "price-asc":
        list.sort((a, b) => a.price.price.minor - b.price.price.minor);
        break;
      case "price-desc":
        list.sort((a, b) => b.price.price.minor - a.price.price.minor);
        break;
      default:
        list.sort(
          (a, b) => Number(b.featured) - Number(a.featured)
        );
    }
    return list;
  }, [apps, q, filter, category, sort]);

  return (
    <div>
      <div className="glass sticky top-16 z-30 mb-8 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-titanium-500"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search applications…"
            aria-label="Search applications"
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-titanium-100 placeholder:text-titanium-500 focus:border-white/25 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            label="Filter"
            value={filter}
            onChange={(v) => setFilter(v as FilterKey)}
            options={[
              ["all", "All"],
              ["free", "Free"],
              ["paid", "Paid"],
              ["freemium", "Freemium"],
            ]}
          />
          {categories.length > 0 && (
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={[["all", "All categories"], ...categories.map((c) => [c, c] as [string, string])]}
            />
          )}
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              ["featured", "Featured"],
              ["new", "Newest"],
              ["popular", "Most downloaded"],
              ["rating", "Top rated"],
              ["price-asc", "Price: low to high"],
              ["price-desc", "Price: high to low"],
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-8 text-center text-titanium-300">
          Unable to load applications right now. Please try again shortly.
        </div>
      )}

      {!apps && !error && (
        <div className="flex items-center justify-center gap-3 py-20 text-titanium-400">
          <Spinner /> Loading catalog…
        </div>
      )}

      {apps && filtered.length === 0 && (
        <div className="glass rounded-2xl px-8 py-16 text-center">
          <p className="text-lg font-medium text-titanium-200">No applications found</p>
          <p className="mt-2 text-sm text-titanium-400">
            {apps.length === 0
              ? "The catalog is being prepared. Check back soon."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      )}

      {apps && filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/10 bg-graphite-800 py-2.5 pl-3 pr-8 text-sm text-titanium-200 focus:border-white/25 focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-graphite-800">
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
