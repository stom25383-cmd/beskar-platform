import { handler, ok, fail, clientIp } from "@/lib/http";
import { repo } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(8).max(200), appId: z.string().min(1) });

/**
 * Validate an entitlement token the buyer's device holds. Used to re-confirm
 * ownership (e.g. after clearing storage, the buyer pastes their token). The
 * server is authoritative: a token is valid only if it exists, isn't revoked,
 * and matches the app.
 */
export const POST = handler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`ent-verify:${ip}`, 40, 60 * 60 * 1000);
  if (!rl.allowed) return fail("Too many attempts. Try again later.", 429);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 422);

  const ent = await repo.getEntitlementByToken(parsed.data.token);
  if (!ent || ent.revoked || ent.appId !== parsed.data.appId) {
    return ok({ valid: false });
  }
  return ok({ valid: true, lifetime: ent.lifetime, appId: ent.appId });
});
