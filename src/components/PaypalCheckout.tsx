"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiSend } from "@/lib/client/api";
import type { PublicApp } from "@/lib/services/apps";
import type { Currency } from "@/lib/client/currency";
import { Spinner } from "./ui";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface CreateResp {
  orderId: string;
  paypalConfigured: boolean;
  providerOrderId?: string;
  message?: string;
}

/**
 * PayPal Smart Buttons integration.
 *
 * SECURITY: the button does NOT know or send the price. It asks our server to
 * create an order (server computes the authoritative amount), then on approval
 * asks our server to capture + verify. Only a server-verified capture yields an
 * entitlement token. If PayPal is not configured, we show an honest message
 * instead of faking a purchase.
 */
export default function PaypalCheckout({
  app,
  displayCurrency,
  onSuccess,
  onCancel,
  onError,
}: {
  app: PublicApp;
  displayCurrency: Currency;
  onSuccess: (entitlementToken: string) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "unconfigured" | "working"
  >("loading");
  const [note, setNote] = useState<string | null>(null);
  const rendered = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const cfg = await apiGet<{
          paypal: { configured: boolean; clientId: string | null; env: string };
        }>("/api/public-config");

        if (cancelled) return;

        if (!cfg.paypal.configured || !cfg.paypal.clientId) {
          setStatus("unconfigured");
          return;
        }

        await loadSdk(cfg.paypal.clientId, app.price.transactionCurrency);
        if (cancelled || !window.paypal || !containerRef.current) return;
        if (rendered.current) return;
        rendered.current = true;

        window.paypal
          .Buttons({
            style: { color: "white", shape: "pill", label: "pay", height: 45 },
            createOrder: async () => {
              const resp = await apiSend<CreateResp>(
                "/api/checkout/create",
                "POST",
                { appId: app.id, displayCurrency }
              );
              if (!resp.paypalConfigured || !resp.providerOrderId) {
                throw new Error(resp.message || "Checkout unavailable");
              }
              // Stash our internal order id for capture step.
              (containerRef.current as any)._beskarOrderId = resp.orderId;
              return resp.providerOrderId;
            },
            onApprove: async (data: { orderID: string }) => {
              setStatus("working");
              const internalOrderId = (containerRef.current as any)
                ._beskarOrderId as string;
              const resp = await apiSend<{
                status: string;
                entitlementToken: string;
              }>("/api/checkout/capture", "POST", {
                orderId: internalOrderId,
                providerOrderId: data.orderID,
              });
              if (resp.status === "paid" && resp.entitlementToken) {
                onSuccess(resp.entitlementToken);
              } else {
                onError("Payment could not be verified.");
                setStatus("ready");
              }
            },
            onCancel: () => onCancel(),
            onError: (err: unknown) => {
              console.error(err);
              onError("Payment failed. Please try again.");
              setStatus("ready");
            },
          })
          .render(containerRef.current);

        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("unconfigured");
          setNote(e instanceof Error ? e.message : null);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "unconfigured") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
        <p className="text-sm font-medium text-titanium-200">
          Checkout not yet enabled
        </p>
        <p className="mt-1 text-xs leading-relaxed text-titanium-400">
          The owner must configure a PayPal client ID and secret to accept
          payments. No purchase is simulated here.
        </p>
        {note && <p className="mt-2 text-[11px] text-titanium-500">{note}</p>}
        <button onClick={onCancel} className="btn-ghost mt-3 px-4 py-2 text-xs">
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      {(status === "loading" || status === "working") && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-titanium-400">
          <Spinner size={16} />
          {status === "working" ? "Verifying payment…" : "Loading secure checkout…"}
        </div>
      )}
      <div ref={containerRef} />
      {status === "ready" && (
        <button
          onClick={onCancel}
          className="mt-2 w-full text-center text-xs text-titanium-500 hover:text-titanium-300"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

const sdkCache = new Map<string, Promise<void>>();
function loadSdk(clientId: string, currency: string): Promise<void> {
  const key = `${clientId}:${currency}`;
  if (sdkCache.has(key)) return sdkCache.get(key)!;
  const p = new Promise<void>((resolve, reject) => {
    if (window.paypal) return resolve();
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.head.appendChild(s);
  });
  sdkCache.set(key, p);
  return p;
}
