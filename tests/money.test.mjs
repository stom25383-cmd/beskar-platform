import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror of src/lib/money.ts conversion logic — guards the invariant that
// display conversion is symmetric and that base==display is a no-op.
const MINOR = { USD: 100, INR: 100 };
function toMajor(minor, c) {
  return minor / MINOR[c];
}
function toMinor(major, c) {
  return Math.round(major * MINOR[c]);
}
function convertMinor(minor, from, to, fx) {
  if (from === to) return minor;
  const usd = toMajor(minor, from) / fx[from];
  return toMinor(usd * fx[to], to);
}
function discountPct(price, mrp) {
  if (mrp <= 0 || price <= 0 || price >= mrp) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

const fx = { USD: 1, INR: 83.4 };

test("same-currency conversion is a no-op", () => {
  assert.equal(convertMinor(1499, "USD", "USD", fx), 1499);
  assert.equal(convertMinor(99900, "INR", "INR", fx), 99900);
});

test("USD -> INR uses fx rate", () => {
  // $14.99 * 83.4 = ₹1250.17 -> 125017 minor units
  const inr = convertMinor(1499, "USD", "INR", fx);
  const expected = toMinor((1499 / 100) * 83.4, "INR");
  assert.equal(inr, expected);
  assert.ok(inr > 124000 && inr < 126000, `got ${inr}`);
});

test("round-trip USD->INR->USD stays close", () => {
  const inr = convertMinor(1499, "USD", "INR", fx);
  const back = convertMinor(inr, "INR", "USD", fx);
  assert.ok(Math.abs(back - 1499) <= 1, `got ${back}`);
});

test("discount percentage", () => {
  assert.equal(discountPct(1499, 2499), 40);
  assert.equal(discountPct(0, 2499), null);
  assert.equal(discountPct(2499, 2499), null);
  assert.equal(discountPct(1000, 0), null);
});
