// ============================================================================
// Order finalization — the single, authoritative place an order becomes "paid"
// and an entitlement is issued. Both the interactive capture endpoint and the
// asynchronous PayPal webhook funnel through here, so verification is identical
// and issuing an entitlement is idempotent.
// ============================================================================

import "server-only";
import { repo } from "../db";
import { toMajor } from "../money";
import { shortId } from "../ids";
import { audit } from "./audit";
import type { Entitlement, Order } from "../types";

export interface FinalizeInput {
  order: Order;
  capturedAmount: string | null; // major units string from PayPal
  capturedCurrency: string | null;
  captureId: string | null;
  source: "capture" | "webhook";
}

export interface FinalizeResult {
  status: "paid" | "failed";
  appId: string;
  entitlementToken: string | null;
  reason?: string;
}

/**
 * Re-verify a captured PayPal payment against OUR authoritative order and, if
 * valid, mark it paid and issue (once) a lifetime/subscription entitlement.
 */
export async function finalizePaidOrder(
  input: FinalizeInput
): Promise<FinalizeResult> {
  const { order } = input;

  // Idempotency: already finalized.
  if (order.status === "paid") {
    return {
      status: "paid",
      appId: order.appId,
      entitlementToken: order.entitlementToken,
    };
  }

  const expectedValue = toMajor(order.amount, order.transactionCurrency).toFixed(2);
  const amountMatches = input.capturedAmount === expectedValue;
  const currencyMatches = input.capturedCurrency === order.transactionCurrency;

  if (!amountMatches || !currencyMatches) {
    await repo.updateOrder(order.id, { status: "failed" });
    await audit({
      actor: "system",
      action: "order.verify.failed",
      resource: `order:${order.id}`,
      before: { expected: expectedValue, currency: order.transactionCurrency },
      after: {
        got: input.capturedAmount,
        currency: input.capturedCurrency,
        source: input.source,
      },
    });
    return {
      status: "failed",
      appId: order.appId,
      entitlementToken: null,
      reason: "amount_mismatch",
    };
  }

  await repo.updateOrder(order.id, {
    status: "paid",
    providerCaptureId: input.captureId ?? order.providerCaptureId,
  });

  // Issue entitlement once (token is deterministic per order, so re-issuing is
  // safe; we guard against duplicates by checking existence first).
  const existing = await repo.getEntitlementByToken(order.entitlementToken);
  if (!existing) {
    const app = await repo.getApp(order.appId);
    const entitlement: Entitlement = {
      id: shortId("ent"),
      token: order.entitlementToken,
      appId: order.appId,
      orderId: order.id,
      lifetime: app?.pricing.lifetime ?? true,
      createdAt: new Date().toISOString(),
      revoked: false,
    };
    await repo.createEntitlement(entitlement);
  }

  await audit({
    actor: "system",
    action: "order.paid",
    resource: `order:${order.id}`,
    after: { source: input.source, appId: order.appId },
  });

  return {
    status: "paid",
    appId: order.appId,
    entitlementToken: order.entitlementToken,
  };
}
