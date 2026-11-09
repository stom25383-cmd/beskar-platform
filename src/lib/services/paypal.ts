// ============================================================================
// PayPal server-side integration.
//
// SECURITY: the browser never tells us the amount or that payment "succeeded".
// Flow:
//   1. Client asks to buy appId (+ display currency).           [our /checkout]
//   2. SERVER looks up the authoritative price, creates a PayPal order with the
//      amount WE computed, stores our Order(status=created).
//   3. Buyer approves in the PayPal UI.
//   4. Client calls capture with the PayPal orderID.
//   5. SERVER captures via PayPal API, re-verifies the captured amount/currency
//      against our Order, and only then marks paid + issues an entitlement.
//
// If PayPal creds are absent, checkout endpoints return a clear "not configured"
// response — we do NOT fake a purchase.
// ============================================================================

import "server-only";
import { env } from "../env";

const BASE = () =>
  env.paypal().envMode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export function paypalConfigured(): boolean {
  return env.paypal().configured;
}

async function accessToken(): Promise<string> {
  const { clientId, clientSecret } = env.paypal();
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal token error ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export interface CreatedPaypalOrder {
  id: string;
  status: string;
}

/** Create a PayPal order for a server-computed amount (major units string). */
export async function createPaypalOrder(params: {
  amountMajor: string;
  currency: "USD" | "INR";
  referenceId: string;
  description: string;
}): Promise<CreatedPaypalOrder> {
  const token = await accessToken();
  const res = await fetch(`${BASE()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.referenceId,
          description: params.description.slice(0, 127),
          amount: {
            currency_code: params.currency,
            value: params.amountMajor,
          },
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "BESKAR",
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal create order failed ${res.status}: ${t}`);
  }
  return (await res.json()) as CreatedPaypalOrder;
}

export interface PaypalOrderDetails {
  status: string;
  amountValue: string | null;
  currency: string | null;
  referenceId: string | null;
}

/** Read an order's current server-side state (used to reconcile webhooks). */
export async function getPaypalOrder(
  providerOrderId: string
): Promise<PaypalOrderDetails> {
  const token = await accessToken();
  const res = await fetch(
    `${BASE()}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  const json = (await res.json()) as any;
  const unit = json?.purchase_units?.[0];
  return {
    status: json?.status ?? `error_${res.status}`,
    amountValue: unit?.amount?.value ?? null,
    currency: unit?.amount?.currency_code ?? null,
    referenceId: unit?.reference_id ?? null,
  };
}

/**
 * Verify a PayPal webhook signature server-side using PayPal's
 * verify-webhook-signature API. Requires PAYPAL_WEBHOOK_ID. Returns true only
 * when PayPal confirms the signature is valid — we never trust a raw webhook.
 */
export async function verifyWebhookSignature(params: {
  headers: Headers;
  rawBody: string;
  webhookId: string;
}): Promise<boolean> {
  const token = await accessToken();
  const body = {
    auth_algo: params.headers.get("paypal-auth-algo"),
    cert_url: params.headers.get("paypal-cert-url"),
    transmission_id: params.headers.get("paypal-transmission-id"),
    transmission_sig: params.headers.get("paypal-transmission-sig"),
    transmission_time: params.headers.get("paypal-transmission-time"),
    webhook_id: params.webhookId,
    webhook_event: JSON.parse(params.rawBody),
  };
  const res = await fetch(
    `${BASE()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  if (!res.ok) return false;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS";
}

export interface CaptureResult {
  captured: boolean;
  captureId: string | null;
  amountValue: string | null;
  currency: string | null;
  status: string;
}

/** Capture and return the AUTHORITATIVE captured amount for re-verification. */
export async function capturePaypalOrder(
  providerOrderId: string
): Promise<CaptureResult> {
  const token = await accessToken();
  const res = await fetch(
    `${BASE()}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  const json = (await res.json()) as any;
  if (!res.ok) {
    return {
      captured: false,
      captureId: null,
      amountValue: null,
      currency: null,
      status: json?.status ?? `error_${res.status}`,
    };
  }
  const capture = json?.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    captured: json?.status === "COMPLETED" && capture?.status === "COMPLETED",
    captureId: capture?.id ?? null,
    amountValue: capture?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? null,
    status: json?.status ?? "UNKNOWN",
  };
}
