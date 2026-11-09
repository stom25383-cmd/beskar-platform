"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client/api";
import { PageHeader, StatCard, Card, StatusPill } from "@/components/admin/ui";
import { Spinner } from "@/components/ui";

interface Stats {
  counts: {
    appsTotal: number;
    published: number;
    drafts: number;
    downloads: number;
    totalDownloadCount: number;
    orders: number;
    paidOrders: number;
    pendingReviews: number;
    reportedReviews: number;
  };
  revenueDisplay: { currency: string; major: number }[];
  downloadsByDay: { date: string; count: number }[];
  topApps: {
    id: string;
    name: string;
    slug: string;
    downloads: number;
    rating: number;
    status: string;
  }[];
  recentActivity: {
    id: string;
    actor: string;
    action: string;
    resource: string;
    createdAt: string;
  }[];
  recentOrders: {
    id: string;
    appName: string;
    amount: number;
    transactionCurrency: string;
    status: string;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Stats>("/api/admin/stats").then(setStats).catch((e) => setErr(e.message));
  }, []);

  if (err)
    return <p className="text-red-300">Failed to load dashboard: {err}</p>;
  if (!stats)
    return (
      <div className="flex items-center gap-2 text-titanium-400">
        <Spinner /> Loading command center…
      </div>
    );

  const maxDay = Math.max(1, ...stats.downloadsByDay.map((d) => d.count));

  return (
    <div>
      <PageHeader
        title="Command center"
        subtitle="Everything you need to run BESKAR at a glance."
        action={
          <Link href="/admin/apps/new" className="btn-primary px-4 py-2 text-sm">
            + New application
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Applications"
          value={stats.counts.appsTotal}
          hint={`${stats.counts.published} published · ${stats.counts.drafts} drafts`}
        />
        <StatCard
          label="Total downloads"
          value={stats.counts.totalDownloadCount.toLocaleString()}
          hint={`${stats.counts.downloads} tracked events`}
        />
        <StatCard
          label="Paid orders"
          value={stats.counts.paidOrders}
          hint={`${stats.counts.orders} total orders`}
        />
        <StatCard
          label="Revenue"
          value={
            stats.revenueDisplay.length ? (
              <span className="flex flex-col text-lg">
                {stats.revenueDisplay.map((r) => (
                  <span key={r.currency}>
                    {r.major.toLocaleString(undefined, {
                      style: "currency",
                      currency: r.currency,
                    })}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )
          }
          hint="By settlement currency"
        />
      </div>

      {(stats.counts.pendingReviews > 0 || stats.counts.reportedReviews > 0) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {stats.counts.pendingReviews > 0 && (
            <Link
              href="/admin/reviews"
              className="glass rounded-xl border-amber-400/20 px-4 py-3 text-sm text-amber-100"
            >
              {stats.counts.pendingReviews} review(s) awaiting moderation →
            </Link>
          )}
          {stats.counts.reportedReviews > 0 && (
            <Link
              href="/admin/reviews"
              className="glass rounded-xl border-red-400/20 px-4 py-3 text-sm text-red-100"
            >
              {stats.counts.reportedReviews} reported review(s) →
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-sm font-semibold text-titanium-100">
            Downloads · last 14 days
          </h2>
          <div className="mt-6 flex h-40 items-end gap-1.5">
            {stats.downloadsByDay.map((d) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-titanium-300/70 transition-colors group-hover:bg-titanium-100"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 2 }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[9px] text-titanium-600">
                  {d.date.slice(8)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-titanium-100">
            Top applications
          </h2>
          <ul className="mt-4 space-y-3">
            {stats.topApps.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <Link
                  href={`/admin/apps/${a.id}`}
                  className="truncate text-sm text-titanium-200 hover:text-titanium-100"
                >
                  {a.name}
                </Link>
                <span className="text-xs text-titanium-400">
                  {a.downloads.toLocaleString()} ↓
                </span>
              </li>
            ))}
            {stats.topApps.length === 0 && (
              <li className="text-sm text-titanium-500">No apps yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-titanium-100">
            Recent orders
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {stats.recentOrders.length === 0 && (
              <li className="text-titanium-500">No orders yet.</li>
            )}
            {stats.recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between border-b border-white/[0.05] pb-2"
              >
                <span className="truncate text-titanium-300">{o.appName}</span>
                <span className="flex items-center gap-3">
                  <span className="text-titanium-400">
                    {(o.amount / 100).toLocaleString(undefined, {
                      style: "currency",
                      currency: o.transactionCurrency,
                    })}
                  </span>
                  <StatusPill status={o.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-titanium-100">
            Recent activity
          </h2>
          <ul className="mt-4 space-y-2 text-xs">
            {stats.recentActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-titanium-300">
                  <span className="font-mono text-titanium-400">{a.action}</span>{" "}
                  {a.resource}
                </span>
                <span className="text-titanium-600">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
