import { handler, ok } from "@/lib/http";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = await getSession();
  return ok(s ? { authenticated: true, email: s.email } : { authenticated: false });
});
