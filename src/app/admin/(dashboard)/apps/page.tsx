"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiGet } from "@/lib/client/api";
import { PageHeader, StatusPill } from "@/components/admin/ui";
import { Spinner } from "@/components/ui";
import type { Application } from "@/lib/types";

export default function AdminAppsList() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet<Application[]>("/api/admin/apps").then(setApps).catch(() => setApps([]));
  }, []);

  const filtered =
    apps?.filter(
      (a) =>
        a.name.toLowerCase().includes(q.toLowerCase()) ||
        a.slug.includes(q.toLowerCase())
    ) ?? [];

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle="Create, edit, publish, and manage every BESKAR application."
        action={
          <Link href="/admin/apps/new" className="btn-primary px-4 py-2 text-sm">
            + New application
          </Link>
        }
      />

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search applications…"
          className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-titanium-100 focus:border-white/25 focus:outline-none"
        />
      </div>

      {!apps && (
        <div className="flex items-center gap-2 text-titanium-400">
          <Spinner /> Loading…
        </div>
      )}

      {apps && filtered.length === 0 && (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-titanium-200">No applications yet</p>
          <p className="mt-1 text-sm text-titanium-400">
            Create your first application to get started.
          </p>
          <Link href="/admin/apps/new" className="btn-primary mt-5 inline-flex px-5 py-2.5 text-sm">
            + New application
          </Link>
        </div>
      )}

      {apps && filtered.length > 0 && (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-titanium-500">
                  <th className="p-4 font-medium">Application</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Model</th>
                  <th className="p-4 font-medium">Version</th>
                  <th className="p-4 font-medium">Downloads</th>
                  <th className="p-4 font-medium">Rating</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const rel =
                    a.releases.find((r) => r.id === a.currentReleaseId) ??
                    a.releases[a.releases.length - 1];
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-graphite-800">
                            {a.iconUrl && (
                              <Image src={a.iconUrl} alt="" fill sizes="36px" className="object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-titanium-100">
                              {a.name}
                            </div>
                            <div className="text-xs text-titanium-500">
                              /{a.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusPill status={a.status} />
                        {a.featured && (
                          <span className="ml-2 text-[10px] text-titanium-400">
                            ★ featured
                          </span>
                        )}
                      </td>
                      <td className="p-4 capitalize text-titanium-300">
                        {a.pricing.model}
                      </td>
                      <td className="p-4 text-titanium-300">
                        {rel ? `v${rel.versionName}` : "—"}
                      </td>
                      <td className="p-4 text-titanium-300">
                        {a.downloadCount.toLocaleString()}
                      </td>
                      <td className="p-4 text-titanium-300">
                        {a.rating.count ? a.rating.average.toFixed(1) : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/apps/${a.id}`}
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
