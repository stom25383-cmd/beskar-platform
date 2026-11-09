import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { siteConfigSchema } from "@/lib/db/schema";
import { audit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin();
  return ok(await repo.getSiteConfig());
});

export const PUT = handler(async (req) => {
  const session = await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = siteConfigSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid configuration", 422);
  const updated = await repo.updateSiteConfig(parsed.data);
  await audit({
    actor: session.email,
    action: "config.update",
    resource: "config:site",
    after: { maintenanceMode: parsed.data.maintenanceMode },
    ip: clientIp(req),
  });
  return ok(updated);
});
