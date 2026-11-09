import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";

// Mirror of the HMAC session token scheme in src/lib/auth.ts. Verifies that a
// tampered payload or signature is rejected — the core security invariant.
const SECRET = "test-secret-000000000000000000000000000000000000000000000000000000";

function b64url(s) {
  return Buffer.from(s).toString("base64url");
}
function sign(data) {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}
function makeToken(payload) {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}
function verify(tok) {
  const [body, sig] = tok.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (Date.now() > payload.exp) return null;
  return payload;
}

test("valid token round-trips", () => {
  const tok = makeToken({ sub: "1", role: "superadmin", exp: Date.now() + 10000 });
  const p = verify(tok);
  assert.equal(p?.role, "superadmin");
});

test("tampered payload is rejected", () => {
  const tok = makeToken({ sub: "1", role: "user", exp: Date.now() + 10000 });
  const [, sig] = tok.split(".");
  const forged = b64url(JSON.stringify({ sub: "1", role: "superadmin", exp: Date.now() + 10000 }));
  assert.equal(verify(`${forged}.${sig}`), null);
});

test("expired token is rejected", () => {
  const tok = makeToken({ sub: "1", role: "superadmin", exp: Date.now() - 1 });
  assert.equal(verify(tok), null);
});

test("garbage token is rejected", () => {
  assert.equal(verify("not-a-token"), null);
  assert.equal(verify("a.b.c"), null);
});
