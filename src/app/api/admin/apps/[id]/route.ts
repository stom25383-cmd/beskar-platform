import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { appInputSchema } from "@/lib/db/schema";
import { audit } from "@/lib/services/audit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return handler(async () => {
    await requireAdmin();
    const app = await repo.getApp(params.id);
    if (!app) return fail("Not found", 404);
    return ok(app);
  })(req);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return handler(async (r) => {
    const session = await requireAdmin();
    const app = await repo.getApp(params.id);
    if (!app) return fail("Not found", 404);

    const body = await r.json().catch(() => null);
    const parsed = appInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || "Invalid application", 422);
    }

    // Slug uniqueness (allow same app to keep its slug).
    if (parsed.data.slug !== app.slug) {
      const clash = await repo.getAppBySlug(parsed.data.slug);
      if (clash) return fail("Another application uses that slug.", 409);
    }

    const before = {
      status: app.status,
      price: app.pricing.price,
      featured: app.featured,
    };
    const updated = await repo.updateApp(params.id, { ...parsed.data });
    await audit({
      actor: session.email,
      action: "app.update",
      resource: `app:${app.slug}`,
      before,
      after: {
        status: parsed.data.status,
        price: parsed.data.pricing.price,
        featured: parsed.data.featured,
      },
      ip: clientIp(r),
    });
    return ok(updated);
  })(req);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handler(async (r) => {
    const session = await requireAdmin();
    const app = await repo.getApp(params.id);
    if (!app) return fail("Not found", 404);
    await repo.deleteApp(params.id);
    await audit({
      actor: session.email,
      action: "app.delete",
      resource: `app:${app.slug}`,
      before: { id: app.id, name: app.name },
      ip: clientIp(r),
    });
    return ok({ deleted: true });
  })(req);
}
