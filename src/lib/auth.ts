// ============================================================================
// Admin authentication & session management.
//
// SECURITY MODEL
//  - Password is stored ONLY as a bcrypt hash (never plaintext, never client).
//  - Session = HMAC-signed token in an httpOnly, Secure, SameSite=Lax cookie.
//    The client cannot read it (httpOnly) and cannot forge it (HMAC secret is
//    server-only). Tampering invalidates the signature.
//  - Authorization is verified on EVERY protected request server-side. The
//    hidden logo gesture is discovery only — it grants nothing.
//  - Rate limiting + lockout on failed logins mitigates brute force.
//
// Firebase is used as the production datastore; the admin session remains a
// server-side HMAC session backed by the single bcrypt-protected admin record.
// ============================================================================

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { env } from "./env";
import { repo } from "./db";
import type { AdminUser } from "./types";
import { uuid } from "./ids";

const COOKIE = "beskar_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h

interface SessionPayload {
  sub: string; // admin id
  email: string;
  role: "superadmin";
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", env.sessionSecret()).update(data).digest("base64url");
}

function makeToken(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

function verifyToken(tok: string): SessionPayload | null {
  const parts = tok.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

// ---- brute-force protection (in-memory sliding window) ----------------------
const attempts = new Map<string, { count: number; first: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export function loginThrottle(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec?.lockUntil && now < rec.lockUntil) {
    return { allowed: false, retryAfterSec: Math.ceil((rec.lockUntil - now) / 1000) };
  }
  return { allowed: true };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now, lockUntil: 0 });
    return;
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockUntil = now + LOCK_MS;
  attempts.set(key, rec);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}

/**
 * Ensure a bootstrap Super Admin exists (idempotent). Works for both the local
 * and firebase drivers: the admin record (with a bcrypt password hash) is
 * created in the active store only when NO admin exists yet AND bootstrap
 * credentials are provided. In production you should set BESKAR_ADMIN_EMAIL /
 * BESKAR_ADMIN_PASSWORD once, sign in, then remove them.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const { email, password } = env.adminBootstrap();
  // In production, only bootstrap when explicit credentials are supplied to
  // avoid silently creating an account with a default password.
  if (env.isProd && (!process.env.BESKAR_ADMIN_EMAIL || !process.env.BESKAR_ADMIN_PASSWORD)) {
    return;
  }
  const count = await repo.countAdmins();
  if (count > 0) return;
  const admin: AdminUser = {
    id: uuid(),
    email,
    passwordHash: await hashPassword(password),
    role: "superadmin",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  await repo.createAdmin(admin);
}

export async function verifyAdminPassword(
  password: string
): Promise<AdminUser | null> {
  const { email } = env.adminBootstrap();
  const admin = await repo.getAdminByEmail(email);
  if (!admin) {
    // Perform a dummy compare to equalize timing and avoid user enumeration.
    await bcrypt.compare(password, "$2a$12$0000000000000000000000000000000000000000000000000000");
    return null;
  }
  const ok = await bcrypt.compare(password, admin.passwordHash);
  return ok ? admin : null;
}

export async function createSession(admin: AdminUser): Promise<void> {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  cookies().set(COOKIE, makeToken(payload), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function destroySession(): void {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Returns the authenticated admin session, or null. Use in server code. */
export async function getSession(): Promise<SessionPayload | null> {
  const tok = cookies().get(COOKIE)?.value;
  if (!tok) return null;
  const session = verifyToken(tok);
  if (!session) return null;
  const admin = await repo.getAdminById(session.sub);
  if (!admin || admin.role !== "superadmin") return null;
  return session;
}

/** Hard guard for API routes: throws a Response-shaped signal if unauthorized. */
export async function requireAdmin(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s || s.role !== "superadmin") {
    throw new UnauthorizedError();
  }
  return s;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
