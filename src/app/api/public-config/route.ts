import { handler, ok } from "@/lib/http";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Public, non-secret runtime config for the browser. */
export const GET = handler(async () => {
  const pp = env.paypal();
  return ok({
    paymentsEnabled: env.paymentsEnabled(),
    paypal: {
      configured: env.paymentsEnabled() && pp.configured,
      // client id is public by design; secret is never sent
      clientId: env.paymentsEnabled() ? pp.clientId || null : null,
      env: pp.envMode,
    },
    baseCurrency: env.baseCurrency(),
  });
});
