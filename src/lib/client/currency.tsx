"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Currency = "USD" | "INR";

interface Ctx {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}

const CurrencyContext = createContext<Ctx | null>(null);
const KEY = "beskar.currency";

function detectDefault(): Currency {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language || "";
    if (/-IN\b/i.test(lang)) return "INR";
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz === "Asia/Calcutta" || tz === "Asia/Kolkata") return "INR";
    } catch {
      /* noop */
    }
  }
  return "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Currency | null;
    setCurrencyState(stored === "INR" || stored === "USD" ? stored : detectDefault());
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* noop */
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
