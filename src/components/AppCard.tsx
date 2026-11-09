"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge, Stars } from "./ui";
import type { PublicApp } from "@/lib/services/apps";

function modelBadge(app: PublicApp) {
  switch (app.price.model) {
    case "free":
      return <Badge tone="free">Free</Badge>;
    case "freemium":
      return <Badge tone="freemium">Freemium</Badge>;
    case "paid":
      return <Badge tone="paid">{app.price.lifetime ? "Lifetime" : "Paid"}</Badge>;
  }
}

export default function AppCard({ app }: { app: PublicApp }) {
  return (
    <Link
      href={`/apps/${app.slug}`}
      className="glass glass-hover group flex flex-col rounded-2xl p-5 focus-visible:outline-none"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-graphite-800">
          <Image
            src={app.iconUrl}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold text-titanium-100">
              {app.name}
            </h3>
            {app.featured && <Badge tone="accent">Featured</Badge>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-titanium-400">
            {app.tagline}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {app.rating.count > 0 ? (
          <Stars value={app.rating.average} count={app.rating.count} />
        ) : (
          <span className="text-xs text-titanium-500/70">No ratings yet</span>
        )}
        <span className="text-xs text-titanium-400">{app.category}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-2">{modelBadge(app)}</div>
        <div className="text-right">
          {app.price.model === "free" ? (
            <span className="text-sm font-semibold text-titanium-100">Free</span>
          ) : (
            <span className="flex items-baseline gap-2">
              {app.price.mrp && app.price.discountPct ? (
                <span className="text-xs text-titanium-500 line-through">
                  {app.price.mrp.formatted}
                </span>
              ) : null}
              <span className="text-sm font-semibold text-titanium-100">
                {app.price.price.formatted}
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
