import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin, verifyAdminPassword, hashPassword, destroySession } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/db/schema";
import { repo } from "@/lib/db";
import { audit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const session = await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return fail("New password must be at least 12 characters.", 422);
  const admin = await verifyAdminPassword(parsed.data.currentPassword);
  if (!admin || admin.id !== session.sub) return fail("Current password is incorrect.", 401);
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await repo.updateAdmin(session.sub, { passwordHash });
  await audit({ actor: session.email, action: "admin.password.changed", resource: "auth", ip: clientIp(req) });
  destroySession();
  return ok({ changed: true });
});
