import { handler, ok, fail, clientIp } from "@/lib/http";
import { loginSchema } from "@/lib/db/schema";
import {
  ensureBootstrapAdmin,
  verifyAdminPassword,
  createSession,
  loginThrottle,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/auth";
import { repo } from "@/lib/db";
import { audit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  await ensureBootstrapAdmin();

  const ip = clientIp(req);
  const throttle = loginThrottle(ip);
  if (!throttle.allowed) {
    return fail(
      `Too many attempts. Try again in ${throttle.retryAfterSec}s.`,
      429
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    recordLoginFailure(ip);
    return fail("Invalid credentials", 401);
  }

  const admin = await verifyAdminPassword(parsed.data.password);
  if (!admin) {
    recordLoginFailure(ip);
    await audit({
      actor: "unknown",
      action: "admin.login.failed",
      resource: "auth",
      ip,
    });
    return fail("Invalid credentials", 401);
  }

  clearLoginFailures(ip);
  await createSession(admin);
  await repo.updateAdmin(admin.id, { lastLoginAt: new Date().toISOString() });
  await audit({
    actor: admin.email,
    action: "admin.login.success",
    resource: "auth",
    ip,
  });

  return ok({ email: admin.email });
});
