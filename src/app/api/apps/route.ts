import { handler, ok } from "@/lib/http";
import { getPublishedApps, toPublicApp } from "@/lib/services/apps";
import type { Currency } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Public catalog. Read-only. Only published apps, sanitized DTOs. */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const cur = (url.searchParams.get("currency") || "USD").toUpperCase();
  const currency: Currency = cur === "INR" ? "INR" : "USD";

  const apps = await getPublishedApps();
  const dtos = apps.map((a) => toPublicApp(a, currency));
  return ok(dtos);
});
