# BESKAR — Testing & production-readiness review

Reproduce with `npm run verify` (lint + typecheck + unit tests) and, with the
dev server running, the runtime checks below.

## Automated

| Suite | Result |
|---|---|
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm run typecheck` (`tsc --noEmit`) | ✅ 0 errors |
| `npm run test` (Node built-in runner) | ✅ 11/11 pass |
| `npm run build` | ✅ compiles; all routes present |

Unit tests (`tests/`): money conversion + round-trip, HMAC session
sign/verify/tamper/expiry, sliding-window rate limiter, APK ZIP magic-byte
validation.

## Public experience

| Check | Result |
|---|---|
| Home / catalog / app detail (SSR + JSON-LD) | ✅ 200 |
| Catalog API USD/INR pricing + settlement note | ✅ |
| Free download (via storage abstraction) | ✅ 200 APK |
| Assistant: free-apps / install / price intents (no AI key) | ✅ grounded, correct |
| `GET /api/health` | ✅ 200, reports integration status |

## Commerce & entitlements

| Check | Result |
|---|---|
| Create order for paid app (server-computed amount) | ✅ |
| Create order for free app | ✅ rejected (400) |
| PayPal not configured | ✅ honest "not configured" (no fake purchase) |
| Capture re-verifies amount+currency (shared finalizer) | ✅ mismatch → no entitlement |
| Webhook unconfigured | ✅ accepts + ignores (no retries) |
| Webhook signature required when configured | ✅ 400 on failed verify |
| Entitlement verify — valid token | ✅ `valid:true` |
| Entitlement verify — bad token | ✅ `valid:false` |
| Paid download w/o entitlement | ✅ 402 |
| Paid download w/ valid entitlement | ✅ 200 APK |
| Paid download w/ token for a DIFFERENT paid app | ✅ 403 |

## Admin & security

| Check | Result |
|---|---|
| Admin API without auth | ✅ 401 |
| Admin page without cookie | ✅ 307 → /admin/login |
| Wrong password | ✅ 401 (+ throttle) |
| Correct password | ✅ 200, httpOnly HMAC cookie |
| Tampered session cookie | ✅ 401 (signature rejected) |
| APK upload: valid ZIP | ✅ stored + server SHA-256 |
| APK upload: non-ZIP | ✅ 415 rejected |
| APK upload rate limit (per admin) | ✅ enforced |
| Download rate limit (per IP) | ✅ enforced |
| Audit log records actions | ✅ |

## Firebase driver

The Firestore `Repo` implementation is complete and type-checked against the
same interface as the local driver. It is exercised by switching
`BESKAR_DRIVER=firebase` with valid `FIREBASE_ADMIN_*` credentials. Without
credentials the app runs on the local driver (default), and `GET /api/health`
reports `firebaseAdmin:false`. Live Firestore/Storage verification requires the
owner's Firebase project (see DEPLOYMENT.md) — this is a configuration step, not
a code gap.

## Known environment limitations (by design, documented)

- Serverless filesystem is ephemeral → use `BESKAR_DRIVER=firebase` +
  `BESKAR_STORAGE_DRIVER=firebase` in production.
- PayPal live capture/webhook require the owner's PayPal app + webhook id.
- Richer chatbot answers require an AI API key; without one the deterministic
  catalog-grounded responder is used (fully functional).
- Seed APKs are valid ZIP/APK containers but are placeholders — replace with real
  signed builds via the admin console.
