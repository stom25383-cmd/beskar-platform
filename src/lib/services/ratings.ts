import "server-only";
import { repo } from "../db";
import type { RatingSummary } from "../types";

/** Recompute a truthful rating summary from visible reviews only. */
export async function recomputeRating(appId: string): Promise<RatingSummary> {
  const reviews = await repo.listReviews({ appId, includeHidden: false });
  const dist: RatingSummary["distribution"] = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  let sum = 0;
  for (const r of reviews) {
    const k = String(r.stars) as keyof typeof dist;
    if (dist[k] !== undefined) dist[k] += 1;
    sum += r.stars;
  }
  const count = reviews.length;
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;
  const summary: RatingSummary = { count, average, distribution: dist };
  await repo.updateApp(appId, { rating: summary });
  return summary;
}
