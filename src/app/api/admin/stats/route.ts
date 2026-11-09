import { handler, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { toMajor } from "@/lib/money";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin();

  const [apps, orders, downloads, reviews, audit] = await Promise.all([
    repo.listApps({ includeHidden: true }),
    repo.listOrders(),
    repo.listDownloads(),
    repo.listReviews({ includeHidden: true }),
    repo.listAudit(12),
  ]);

  const published = apps.filter((a) => a.status === "published");
  const drafts = apps.filter((a) => a.status === "draft");
  const paidOrders = orders.filter((o) => o.status === "paid");

  // Revenue grouped by transaction currency (never conflate currencies).
  const revenueByCurrency: Record<string, number> = {};
  for (const o of paidOrders) {
    revenueByCurrency[o.transactionCurrency] =
      (revenueByCurrency[o.transactionCurrency] || 0) + o.amount;
  }
  const revenueDisplay = Object.entries(revenueByCurrency).map(
    ([cur, minor]) => ({
      currency: cur,
      major: toMajor(minor, cur as "USD" | "INR"),
    })
  );

  // Downloads over last 14 days.
  const days: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: 0 });
  }
  const byDay = new Map(days.map((d) => [d.date, d]));
  for (const dl of downloads) {
    const key = dl.createdAt.slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) bucket.count += 1;
  }

  const pendingReviews = reviews.filter((r) => r.status === "hidden").length;
  const reportedReviews = reviews.filter((r) => r.status === "reported").length;

  return ok({
    counts: {
      appsTotal: apps.length,
      published: published.length,
      drafts: drafts.length,
      downloads: downloads.length,
      totalDownloadCount: apps.reduce((s, a) => s + a.downloadCount, 0),
      orders: orders.length,
      paidOrders: paidOrders.length,
      pendingReviews,
      reportedReviews,
    },
    revenueDisplay,
    downloadsByDay: days,
    topApps: [...apps]
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        downloads: a.downloadCount,
        rating: a.rating.average,
        status: a.status,
      })),
    recentActivity: audit,
    recentOrders: orders.slice(0, 8),
  });
});
