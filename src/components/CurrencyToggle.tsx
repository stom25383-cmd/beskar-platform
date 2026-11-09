"use client";

import { useCurrency, type Currency } from "@/lib/client/currency";

export default function CurrencyToggle({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const options: Currency[] = ["USD", "INR"];

  return (
    <div
      role="group"
      aria-label="Display currency"
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] p-0.5"
    >
      {options.map((c) => {
        const active = currency === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-titanium-100 text-graphite-900"
                : "text-titanium-400 hover:text-titanium-200"
            } ${compact ? "min-w-[42px]" : "min-w-[48px]"}`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
