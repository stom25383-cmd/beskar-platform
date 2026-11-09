import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { repo } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Reports which integrations are configured
 * (booleans only — never secrets). Returns 200 when the app can serve, 503 when
 * the datastore is unreachable. Suitable for uptime monitors and Vercel checks.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
    driver: env.driver,
    storageDriver: env.storageDriver(),
    integrations: {
      paypal: env.paypal().configured,
      paypalWebhook: Boolean(env.paypalWebhookId()),
      firebaseAdmin: Boolean(
        env.firebaseAdmin().projectId &&
          env.firebaseAdmin().clientEmail &&
          env.firebaseAdmin().privateKey
      ),
      ai: env.ai().configured,
    },
  };

  try {
    // Cheap datastore round-trip.
    await repo.getSiteConfig();
    checks.datastore = "reachable";
  } catch (e) {
    checks.status = "degraded";
    checks.datastore = "unreachable";
    return NextResponse.json(checks, { status: 503 });
  }

  return NextResponse.json(checks, { status: 200 });
}
