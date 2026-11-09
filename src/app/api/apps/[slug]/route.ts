import { handler, ok, fail } from "@/lib/http";
import { repo } from "@/lib/db";
import { toPublicApp } from "@/lib/services/apps";
import type { Currency } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  return handler(async (r) => {
    const url = new URL(r.url);
    const cur = (url.searchParams.get("currency") || "USD").toUpperCase();
    const currency: Currency = cur === "INR" ? "INR" : "USD";

    const app = await repo.getAppBySlug(params.slug);
    if (!app || app.status !== "published") {
      return fail("Application not found", 404);
    }
    return ok(toPublicApp(app, currency));
  })(req);
}
