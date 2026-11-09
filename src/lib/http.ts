import { NextResponse } from "next/server";
import { UnauthorizedError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Wrap an API handler with uniform error handling (no stack leaks). */
export function handler(
  fn: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return fail("Unauthorized", 401);
      }
      // Log server-side, never expose internals to the client.
      console.error("[beskar] unhandled API error:", err);
      return fail("An unexpected error occurred.", 500);
    }
  };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
