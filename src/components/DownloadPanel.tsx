"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiSend } from "@/lib/client/api";
import { useCurrency } from "@/lib/client/currency";
import {
  getEntitlementToken,
  saveEntitlement,
} from "@/lib/client/entitlements";
import type { PublicApp } from "@/lib/services/apps";
import { formatBytes } from "@/lib/money";
import { Spinner } from "./ui";
import PaypalCheckout from "./PaypalCheckout";

type Phase =
  | "idle"
  | "downloading"
  | "purchasing"
  | "owned"
  | "unavailable";

export default function DownloadPanel({ app }: { app: PublicApp }) {
  const { currency } = useCurrency();
  const [agreed, setAgreed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [entToken, setEntToken] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  const rel = app.currentRelease;
  const isPaid = app.price.model === "paid" && app.price.price.minor > 0;
  const available = Boolean(rel);

  useEffect(() => {
    fetch("/api/public-config").then((r) => r.json()).then((x) => setPaymentsEnabled(Boolean(x?.data?.paypal?.configured))).catch(() => {});
    if (isPaid) {
      const t = getEntitlementToken(app.id);
      setEntToken(t);
      if (t) setPhase("owned");
    }
  }, [app.id, isPaid]);

  const download = () => {
    if (!available) return;
    const url = isPaid
      ? `/api/download/${app.slug}?t=${encodeURIComponent(entToken || "")}`
      : `/api/download/${app.slug}`;
    // Trigger the browser download via the controlled endpoint.
    setPhase("downloading");
    setMessage(null);
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => setPhase(isPaid ? "owned" : "idle"), 1500);
  };

  const onPurchased = (token: string) => {
    saveEntitlement(app.id, token);
    setEntToken(token);
    setShowCheckout(false);
    setPhase("owned");
    setMessage("Purchase verified. Your lifetime access is saved on this device.");
  };

  return (
    <div className="glass rounded-2xl p-6">
      {/* Price block */}
      <div className="flex items-end justify-between">
        <div>
          {app.price.model === "free" ? (
            <span className="text-3xl font-semibold text-titanium-100">Free</span>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-titanium-100">
                {app.price.price.formatted}
              </span>
              {app.price.mrp && app.price.discountPct ? (
                <span className="text-sm text-titanium-500 line-through">
                  {app.price.mrp.formatted}
                </span>
              ) : null}
            </div>
          )}
          <div className="mt-1 text-xs text-titanium-400">
            {app.price.model === "paid"
              ? app.price.lifetime
                ? "One-time payment · Lifetime access"
                : "One-time payment"
              : app.price.model === "freemium"
              ? "Free to install · Premium available in-app"
              : "No payment required"}
          </div>
        </div>
        {app.price.discountPct ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200/90">
            −{app.price.discountPct}%
          </span>
        ) : null}
      </div>

      {app.price.conversionNote && (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-titanium-400">
          {app.price.conversionNote}
        </p>
      )}

      {/* Terms gate */}
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-titanium-400">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-titanium-200"
        />
        <span>
          I have read and accept the{" "}
          <Link href="/legal/terms" className="text-titanium-200 underline">
            Terms
          </Link>
          ,{" "}
          <Link href="/legal/download-notice" className="text-titanium-200 underline">
            Download Notice
          </Link>
          , and understand this app is distributed outside the Play Store.
        </span>
      </label>

      {/* Primary action */}
      <div className="mt-5">
        {!available ? (
          <button disabled className="btn-primary w-full py-3 text-sm">
            Currently unavailable
          </button>
        ) : isPaid && phase !== "owned" ? (
          !paymentsEnabled ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-sm font-medium text-titanium-200">Purchase coming later</p>
              <p className="mt-1 text-xs text-titanium-500">Direct website purchases are not enabled yet.</p>
            </div>
          ) : showCheckout ? (
            <PaypalCheckout
              app={app}
              displayCurrency={currency}
              onSuccess={onPurchased}
              onCancel={() => setShowCheckout(false)}
              onError={(m) => setMessage(m)}
            />
          ) : (
            <button
              disabled={!agreed}
              onClick={() => setShowCheckout(true)}
              className="btn-primary w-full py-3 text-sm"
            >
              Purchase · {app.price.price.formatted}
            </button>
          )
        ) : (
          <button
            disabled={!agreed || phase === "downloading"}
            onClick={download}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm"
          >
            {phase === "downloading" ? (
              <>
                <Spinner size={16} /> Preparing…
              </>
            ) : isPaid ? (
              "Download APK"
            ) : (
              "Download APK"
            )}
          </button>
        )}
      </div>

      {isPaid && phase === "owned" && (
        <p className="mt-3 text-center text-xs text-emerald-200/80">
          ✓ You own this app — lifetime access on this device
        </p>
      )}

      {/* Restore purchase — for buyers on a new device / cleared storage */}
      {isPaid && phase !== "owned" && (
        <RestorePurchase
          appId={app.id}
          onRestored={(token) => onPurchased(token)}
        />
      )}

      {message && (
        <p className="mt-3 text-center text-xs text-titanium-300">{message}</p>
      )}

      {/* Release facts */}
      {rel && (
        <dl className="mt-6 space-y-3 border-t border-white/[0.06] pt-5 text-sm">
          <Fact label="Version">v{rel.versionName}</Fact>
          <Fact label="Size">{formatBytes(rel.fileSizeBytes)}</Fact>
          <Fact label="Requires">Android {rel.minAndroid}+</Fact>
          <Fact label="Updated">
            {new Date(rel.releaseDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Fact>
        </dl>
      )}

      <p className="mt-5 flex items-center gap-2 text-[11px] text-titanium-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Integrity details available on the Integrity tab.
      </p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-titanium-500">{label}</dt>
      <dd className="text-titanium-200">{children}</dd>
    </div>
  );
}

function RestorePurchase({
  appId,
  onRestored,
}: {
  appId: string;
  onRestored: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "invalid">("idle");

  const restore = async () => {
    const clean = token.trim();
    if (!clean) return;
    setState("checking");
    try {
      const res = await apiSend<{ valid: boolean }>(
        "/api/entitlements/verify",
        "POST",
        { token: clean, appId }
      );
      if (res.valid) onRestored(clean);
      else setState("invalid");
    } catch {
      setState("invalid");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full text-center text-xs text-titanium-500 hover:text-titanium-300"
      >
        Already purchased? Restore access
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <label className="mb-1.5 block text-[11px] text-titanium-400">
        Paste your entitlement token
      </label>
      <input
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          setState("idle");
        }}
        placeholder="Token from your purchase confirmation"
        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-titanium-100 focus:border-white/25 focus:outline-none"
      />
      {state === "invalid" && (
        <p className="mt-1.5 text-[11px] text-red-300">
          That token isn&apos;t valid for this app. Contact support if you need
          help.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={restore}
          disabled={state === "checking" || !token.trim()}
          className="btn-primary flex-1 py-2 text-xs disabled:opacity-40"
        >
          {state === "checking" ? "Checking…" : "Restore"}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost px-3 py-2 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}
