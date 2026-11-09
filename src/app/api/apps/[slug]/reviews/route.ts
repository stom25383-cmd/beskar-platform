import { handler, ok, fail, clientIp } from "@/lib/http";
import { repo } from "@/lib/db";
import { reviewInputSchema } from "@/lib/db/schema";
import { recomputeRating } from "@/lib/services/ratings";
import { shortId } from "@/lib/ids";
import type { Review } from "@/lib/types";

export const dynamic = "force-dynamic";

// Simple per-IP rate limit for review submission (in-memory).
const recent = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (recent.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  arr.push(now);
  recent.set(ip, arr);
  return arr.length > 5; // max 5 reviews/hour/IP
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  return handler(async () => {
    const app = await repo.getAppBySlug(params.slug);
    if (!app || app.status !== "published") return fail("Not found", 404);
    const reviews = await repo.listReviews({ appId: app.id });
    // Never expose moderation status internals beyond what's needed.
    const safe = reviews.map((r) => ({
      id: r.id,
      author: r.author,
      stars: r.stars,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      verifiedPurchase: r.verifiedPurchase,
    }));
    return ok(safe);
  })(req);
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  return handler(async (r) => {
    const ip = clientIp(r);
    if (limited(ip)) return fail("Too many submissions. Try again later.", 429);

    const app = await repo.getAppBySlug(params.slug);
    if (!app || app.status !== "published") return fail("Not found", 404);

    const body = await r.json().catch(() => null);
    const parsed = reviewInputSchema.safeParse({ ...body, appId: app.id });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || "Invalid review", 422);
    }

    // New reviews enter as hidden pending moderation — no auto social proof.
    const review: Review = {
      id: shortId("rev"),
      appId: app.id,
      author: parsed.data.author.trim(),
      stars: parsed.data.stars,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      status: "hidden",
      createdAt: new Date().toISOString(),
      verifiedPurchase: false,
    };
    await repo.createReview(review);
    // Rating recompute only counts visible reviews, so hidden pending ones
    // do not inflate the average.
    await recomputeRating(app.id);
    return ok({ submitted: true, pendingModeration: true });
  })(req);
}
