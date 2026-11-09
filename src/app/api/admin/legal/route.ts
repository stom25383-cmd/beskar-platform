import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { legalSchema } from "@/lib/db/schema";
import { audit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin();
  return ok(await repo.listLegal());
});

export const PUT = handler(async (req) => {
  const session = await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = legalSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid legal document", 422);
  const doc = await repo.upsertLegal({
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  });
  await audit({
    actor: session.email,
    action: "legal.update",
    resource: `legal:${doc.id}`,
    ip: clientIp(req),
  });
  return ok(doc);
});
