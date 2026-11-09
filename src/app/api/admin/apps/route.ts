import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { appInputSchema } from "@/lib/db/schema";
import { buildApp } from "@/lib/services/appFactory";
import { audit } from "@/lib/services/audit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** List ALL apps (incl. drafts/unpublished/archived) — admin only. */
export const GET = handler(async () => {
  await requireAdmin();
  const apps = await repo.listApps({ includeHidden: true });
  return ok(apps);
});

/** Create a new application. */
export const POST = handler(async (req) => {
  const session = await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = appInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Invalid application", 422);
  }
  if (parsed.data.status === "published" && parsed.data.pricing.model === "paid" && parsed.data.pricing.price > 0 && !env.paymentsEnabled()) {
    return fail("Paid applications are temporarily disabled until payments are enabled.", 409);
  }

  const existing = await repo.getAppBySlug(parsed.data.slug);
  if (existing) return fail("An application with that slug already exists.", 409);

  const app = buildApp(parsed.data);
  await repo.createApp(app);
  await audit({
    actor: session.email,
    action: "app.create",
    resource: `app:${app.slug}`,
    after: { id: app.id, name: app.name, status: app.status },
    ip: clientIp(req),
  });
  return ok(app);
});
