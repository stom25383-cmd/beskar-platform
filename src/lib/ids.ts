import { randomBytes, randomUUID } from "crypto";

export function uuid(): string {
  return randomUUID();
}

/** URL-safe opaque token. */
export function token(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Short id for readable references (orders, audit). */
export function shortId(prefix = ""): string {
  const s = randomBytes(6).toString("hex");
  return prefix ? `${prefix}_${s}` : s;
}
