// ============================================================================
// Money & currency — pure functions, safe to run anywhere.
// All product amounts are stored in the BASE (transaction) currency, in minor
// units. Display conversion is derived from server-provided FX rates. The UI
// never *decides* a price; it only formats what the server computed.
// ============================================================================

import type { Currency, Pricing, PricedDisplay } from "./types";

const MINOR: Record<Currency, number> = { USD: 100, INR: 100 };

const LOCALE: Record<Currency, string> = { USD: "en-US", INR: "en-IN" };

export function toMinor(major: number, currency: Currency): number {
  return Math.round(major * MINOR[currency]);
}

export function toMajor(minor: number, currency: Currency): number {
  return minor / MINOR[currency];
}

export function formatMinor(minor: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "INR" ? 0 : 2,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(toMajor(minor, currency));
}

/**
 * Convert an amount in the base transaction currency to a display currency
 * using FX rates expressed as "units of currency per 1 USD".
 */
export function convertMinor(
  minor: number,
  from: Currency,
  to: Currency,
  fx: Record<Currency, number>
): number {
  if (from === to) return minor;
  const majorFrom = toMajor(minor, from);
  const usd = majorFrom / fx[from];
  const majorTo = usd * fx[to];
  return toMinor(majorTo, to);
}

export function discountPct(price: number, mrp: number): number | null {
  if (mrp <= 0 || price <= 0 || price >= mrp) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * Build the display object for a product given the buyer's chosen display
 * currency. Truthful: it tells the buyer when the displayed currency differs
 * from the settlement currency so we never imply a false settlement.
 */
export function priceForDisplay(
  pricing: Pricing,
  displayCurrency: Currency,
  fx: Record<Currency, number>
): PricedDisplay {
  const txCur = pricing.currency;
  const priceDisp = convertMinor(pricing.price, txCur, displayCurrency, fx);
  const mrpDisp =
    pricing.mrp > 0 ? convertMinor(pricing.mrp, txCur, displayCurrency, fx) : 0;

  const differs = txCur !== displayCurrency;
  const conversionNote = differs
    ? `Shown in ${displayCurrency}. Payment is settled in ${txCur} (approx. conversion).`
    : null;

  return {
    model: pricing.model,
    lifetime: pricing.lifetime,
    freemiumNote: pricing.freemiumNote,
    subscriptionNote: pricing.subscriptionNote,
    transactionCurrency: txCur,
    displayCurrency,
    price: {
      minor: priceDisp,
      formatted:
        pricing.model === "free" ? "Free" : formatMinor(priceDisp, displayCurrency),
    },
    mrp:
      mrpDisp > 0
        ? { minor: mrpDisp, formatted: formatMinor(mrpDisp, displayCurrency) }
        : null,
    discountPct: discountPct(pricing.price, pricing.mrp),
    conversionNote,
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
