// ============================================================================
// Environment access — server-side only for secrets.
// This module must never be imported into client components with secret reads.
// ============================================================================

import "server-only";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export type Driver = "local" | "firebase";

export const env = {
  driver: (opt("BESKAR_DRIVER", "local") as Driver),

  sessionSecret: () =>
    req(
      "BESKAR_SESSION_SECRET",
      // Dev-only deterministic fallback so the preview runs without setup.
      process.env.NODE_ENV === "production"
        ? undefined
        : "beskar-dev-insecure-session-secret-change-me-000000000000000000000000"
    ),

  adminBootstrap: () => ({
    email: opt("BESKAR_ADMIN_EMAIL", "owner@beskar.app"),
    password: opt("BESKAR_ADMIN_PASSWORD", process.env.NODE_ENV === "production" ? "" : "beskar-admin-2024"),
  }),

  baseCurrency: (): "USD" | "INR" =>
    (opt("BESKAR_BASE_CURRENCY", "USD") as "USD" | "INR"),

  fx: (): Record<"USD" | "INR", number> => ({
    USD: Number(opt("BESKAR_FX_USD", "1")) || 1,
    INR: Number(opt("BESKAR_FX_INR", "83.4")) || 83.4,
  }),

  siteUrl: () => opt("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  siteName: () => opt("NEXT_PUBLIC_SITE_NAME", "BESKAR"),

  paymentsEnabled: () => opt("BESKAR_PAYMENTS_ENABLED", "false").toLowerCase() === "true",

  paypal: () => ({
    clientId: opt("NEXT_PUBLIC_PAYPAL_CLIENT_ID"),
    clientSecret: opt("PAYPAL_CLIENT_SECRET"),
    envMode: opt("PAYPAL_ENV", "sandbox"),
    configured: Boolean(
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    ),
  }),

  firebaseAdmin: () => ({
    projectId: opt("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: opt("FIREBASE_ADMIN_CLIENT_EMAIL"),
    privateKey: opt("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
  }),

  firebaseStorageBucket: () =>
    opt("FIREBASE_STORAGE_BUCKET") ||
    opt("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),

  paypalWebhookId: () => opt("PAYPAL_WEBHOOK_ID"),

  // AI assistant / chatbot. Provider-agnostic; "openai"-compatible chat API.
  ai: () => ({
    provider: opt("BESKAR_AI_PROVIDER", "openai"),
    apiKey: opt("BESKAR_AI_API_KEY"),
    baseUrl: opt("BESKAR_AI_BASE_URL", "https://api.openai.com/v1"),
    model: opt("BESKAR_AI_MODEL", "gpt-4o-mini"),
    configured: Boolean(process.env.BESKAR_AI_API_KEY),
  }),

  storageDriver: (): "local" | "firebase" => {
    const explicit = opt("BESKAR_STORAGE_DRIVER");
    if (explicit === "local" || explicit === "firebase") return explicit;
    // Default: mirror the persistence driver.
    return (opt("BESKAR_DRIVER", "local") as Driver) === "firebase"
      ? "firebase"
      : "local";
  },

  isProd: process.env.NODE_ENV === "production",
};
