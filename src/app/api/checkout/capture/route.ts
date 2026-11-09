import { handler, ok, fail, clientIp } from "@/lib/http";
import { env } from "@/lib/env";
import { repo } from "@/lib/db";
import { checkoutCaptureSchema } from "@/lib/db/schema";
import { capturePaypalOrder, paypalConfigured } from "@/lib/services/paypal";
import { finalizePaidOrder } from "@/lib/services/orders";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Capture + verify a PayPal payment. This is the real security boundary for
 * commerce: we independently capture on the server and re-verify the captured
 * amount and currency against OUR stored order (via finalizePaidOrder) before
 * issuing an entitlement. The client cannot claim "paid".
 */
export const POST = handler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`checkout-capture:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return fail("Too many attempts. Try again later.", 429);

  const body = await req.json().catch(() => null);
  const parsed = checkoutCaptureSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 422);

  const order = await repo.getOrder(parsed.data.orderId);
  if (!order) return fail("Order not found", 404);

  // Idempotency: if already paid, return the existing entitlement.
  if (order.status === "paid") {
    return ok({
      status: "paid",
      appId: order.appId,
      entitlementToken: order.entitlementToken,
    });
  }

  if (order.providerOrderId !== parsed.data.providerOrderId) {
    return fail("Order mismatch", 400);
  }

  if (!env.paymentsEnabled() || !paypalConfigured()) {
    return fail("Payment provider is not configured.", 503);
  }

  await repo.updateOrder(order.id, { status: "verifying" });

  const result = await capturePaypalOrder(order.providerOrderId);
  if (!result.captured) {
    await repo.updateOrder(order.id, { status: "failed" });
    return fail("Payment could not be verified.", 402, { status: result.status });
  }

  const finalized = await finalizePaidOrder({
    order,
    capturedAmount: result.amountValue,
    capturedCurrency: result.currency,
    captureId: result.captureId,
    source: "capture",
  });

  if (finalized.status !== "paid") {
    return fail("Payment verification failed (amount mismatch).", 409);
  }

  return ok({
    status: "paid",
    appId: finalized.appId,
    entitlementToken: finalized.entitlementToken,
  });
});
