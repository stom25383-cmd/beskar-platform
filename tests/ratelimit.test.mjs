import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror of src/lib/rateLimit.ts sliding-window behavior.
const buckets = new Map();
function rateLimit(key, limit, windowMs, now = Date.now()) {
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    buckets.set(key, b);
    return { allowed: false };
  }
  b.hits.push(now);
  buckets.set(key, b);
  return { allowed: true };
}

test("allows up to the limit then blocks", () => {
  const now = 1_000_000;
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit("k", 5, 60000, now).allowed, true, `hit ${i}`);
  }
  assert.equal(rateLimit("k", 5, 60000, now).allowed, false);
});

test("window resets after expiry", () => {
  const base = 2_000_000;
  for (let i = 0; i < 3; i++) rateLimit("w", 3, 1000, base);
  assert.equal(rateLimit("w", 3, 1000, base).allowed, false);
  // advance past the window
  assert.equal(rateLimit("w", 3, 1000, base + 2000).allowed, true);
});
