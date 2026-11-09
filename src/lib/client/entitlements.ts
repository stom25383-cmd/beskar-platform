"use client";

// Anonymous, privacy-conscious entitlement storage.
// After a verified purchase the SERVER issues an opaque entitlement token.
// We keep it on the device (localStorage) so the buyer can re-download without
// creating an account. The token is validated server-side on every download —
// possession of the token alone does not bypass server checks.

const KEY = "beskar.entitlements";

interface StoredEntitlement {
  appId: string;
  token: string;
  createdAt: string;
}

function read(): StoredEntitlement[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list: StoredEntitlement[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function saveEntitlement(appId: string, token: string) {
  const list = read().filter((e) => e.appId !== appId);
  list.push({ appId, token, createdAt: new Date().toISOString() });
  write(list);
}

export function getEntitlementToken(appId: string): string | null {
  return read().find((e) => e.appId === appId)?.token ?? null;
}

export function hasEntitlement(appId: string): boolean {
  return Boolean(getEntitlementToken(appId));
}
