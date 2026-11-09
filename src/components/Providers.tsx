"use client";

import type { ReactNode } from "react";
import { CurrencyProvider } from "@/lib/client/currency";

export default function Providers({ children }: { children: ReactNode }) {
  return <CurrencyProvider>{children}</CurrencyProvider>;
}
