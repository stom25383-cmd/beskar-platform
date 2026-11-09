import { handler, ok } from "@/lib/http";
import { destroySession, getSession } from "@/lib/auth";
import { audit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  const s = await getSession();
  destroySession();
  if (s) {
    await audit({ actor: s.email, action: "admin.logout", resource: "auth" });
  }
  return ok({ loggedOut: true });
});
