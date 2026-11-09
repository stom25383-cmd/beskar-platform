import { fail } from "@/lib/http";
import { NextResponse } from "next/server";
import { repo } from "@/lib/db";
import { env } from "@/lib/env";
import {
  verifyWebhookSignature,
  getPaypalOrder,
  paypalConfigured,
} from "@/lib/services/paypal";
import { finalizePaidOrder } from "@/lib/services/orders";
import { audit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

/**
 * PayPal webhook receiver.
 *
 * SECURITY: every webhook is verified server-side via PayPal's
 * verify-webhook-signature API (requires PAYPAL_WEBHOOK_ID). We NEVER trust the
 * raw payload. On a verified capture/approval event we reconcile the order
 * server-side (re-reading the authoritative amount from PayPal) and finalize it
 * idempotently — so a payment still completes even if the buyer closed the tab
 * before the interactive capture returned.
 *
 * Returns 200 quickly for handled/ignored events so PayPal doesn't retry
 * needlessly; returns 4xx only when the request itself is invalid/unverified.
 */
export async function POST(req: Request) {
  // Read the raw body once — signature verification needs the exact bytes.
  const rawBody = await req.text();

  if (!paypalConfigured()) {
    // Accept but ignore when not configured, so setup doesn't produce retries.
    return NextResponse.json({ ok: true, ignored: "paypal_not_configured" });
  }

  const webhookId = env.paypalWebhookId();
  if (!webhookId) {
    return fail("Webhook not configured (PAYPAL_WEBHOOK_ID missing).", 503);
  }

  const verified = await verifyWebhookSignature({
    headers: req.headers,
    rawBody,
    webhookId,
  });
  if (!verified) {
    await audit({
      actor: "paypal-webhook",
      action: "webhook.verify.failed",
      resource: "paypal",
    });
    return fail("Webhook signature verification failed.", 400);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return fail("Invalid JSON.", 400);
  }

  const type: string = event?.event_type ?? "";

  // We act on capture completion and order approval.
  const relevant =
    type === "CHECKOUT.ORDER.APPROVED" ||
    type === "PAYMENT.CAPTURE.COMPLETED" ||
    type === "CHECKOUT.ORDER.COMPLETED";

  if (!relevant) {
    return NextResponse.json({ ok: true, ignored: type || "unknown" });
  }

  // Resolve OUR order id from the PayPal reference_id (we set it at creation).
  const resource = event?.resource ?? {};
  const referenceId: string | null =
    resource?.purchase_units?.[0]?.reference_id ??
    resource?.supplementary_data?.related_ids?.order_id ??
    null;

  // Prefer our reference_id; fall back to the PayPal order id lookup.
  let order = referenceId ? await repo.getOrder(referenceId) : null;

  // If the webhook carried a PayPal order id, reconcile via that.
  const providerOrderId: string | null =
    resource?.id ??
    resource?.supplementary_data?.related_ids?.order_id ??
    null;

  if (!order && providerOrderId) {
    const all = await repo.listOrders();
    order = all.find((o) => o.providerOrderId === providerOrderId) ?? null;
  }

  if (!order) {
    // Nothing we can reconcile; acknowledge so PayPal stops retrying.
    return NextResponse.json({ ok: true, ignored: "order_not_found" });
  }

  if (order.status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  // Re-read the authoritative amount from PayPal, then finalize idempotently.
  const details = order.providerOrderId
    ? await getPaypalOrder(order.providerOrderId)
    : { amountValue: null, currency: null, status: "UNKNOWN", referenceId: null };

  const capture = resource?.amount
    ? { value: resource.amount.value, currency: resource.amount.currency_code }
    : { value: details.amountValue, currency: details.currency };

  const finalized = await finalizePaidOrder({
    order,
    capturedAmount: capture.value ?? null,
    capturedCurrency: capture.currency ?? null,
    captureId: resource?.id ?? order.providerCaptureId ?? null,
    source: "webhook",
  });

  return NextResponse.json({ ok: true, result: finalized.status });
}
