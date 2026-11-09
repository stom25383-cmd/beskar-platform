import { handler, ok, fail } from "@/lib/http";
import { repo } from "@/lib/db";
import { env } from "@/lib/env";
import { checkoutCreateSchema } from "@/lib/db/schema";
import { toMajor } from "@/lib/money";
import { createPaypalOrder, paypalConfigured } from "@/lib/services/paypal";
import { shortId, token as makeToken } from "@/lib/ids";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Create a purchase order. THE SERVER decides the amount from the stored
 * pricing — never the client. The client only says which app + which display
 * currency it is showing (for the record).
 */
export const POST = handler(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = checkoutCreateSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 422);

  const app = await repo.getApp(parsed.data.appId);
  if (!app || app.status !== "published") return fail("Application not found", 404);

  if (app.pricing.model !== "paid" || app.pricing.price <= 0) {
    return fail("This application is not a paid product.", 400);
  }

  // Authoritative amount, in the app's transaction currency.
  const txCurrency = app.pricing.currency;
  const amountMinor = app.pricing.price;
  const amountMajor = toMajor(amountMinor, txCurrency).toFixed(2);

  const order: Order = {
    id: shortId("ord"),
    appId: app.id,
    appName: app.name,
    amount: amountMinor,
    transactionCurrency: txCurrency,
    displayCurrency: parsed.data.displayCurrency,
    status: "created",
    provider: "paypal",
    providerOrderId: null,
    providerCaptureId: null,
    entitlementToken: makeToken(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!env.paymentsEnabled() || !paypalConfigured()) {
    // Do NOT fake a purchase. Persist the intent and clearly signal that
    // PayPal must be configured by the owner to complete real payments.
    await repo.createOrder(order);
    return ok({
      orderId: order.id,
      paypalConfigured: false,
      message:
        "Payment provider is not configured in this environment. Add PayPal credentials to enable live checkout.",
    });
  }

  const pp = await createPaypalOrder({
    amountMajor,
    currency: txCurrency,
    referenceId: order.id,
    description: `BESKAR — ${app.name}`,
  });

  order.providerOrderId = pp.id;
  order.status = "pending";
  await repo.createOrder(order);

  return ok({
    orderId: order.id,
    paypalConfigured: true,
    providerOrderId: pp.id,
  });
});
