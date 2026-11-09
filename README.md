# BESKAR — Android Application Distribution Platform

A production-oriented platform for discovering, trusting, and downloading BESKAR
Android applications, plus a private administrative command center for the owner.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, a
**swappable persistence layer** (local disk driver ↔ Firebase), server-side
**PayPal** verification, and a security model designed to survive full knowledge
of the implementation.

---

## 1. Quick start (runs today, no external services)

```bash
npm install
cp .env.example .env.local          # defaults already work for local dev
npm run seed                        # populate a premium demo catalog
npm run dev                         # http://localhost:3000
```

- Public site: <http://localhost:3000>
- Admin console: **hold the header logo for 20 seconds**; the gesture is intentionally silent and opens the private password gate
  - Email: `owner@beskar.app`
  - Password: `beskar-admin-2024` (change immediately in production)

> The default driver is `local`: a disk-persisted JSON store at `data/beskar.json`
> with real bcrypt-hashed admin auth, HMAC-signed sessions, and server-side
> price/entitlement validation. **Nothing is faked** — the client never decides
> price, entitlement, or admin status.

---

## 2. What's real vs. what needs owner secrets

This platform is fully functional locally. Several capabilities require
**owner-only credentials** and are wired as clean integration points (not fakes).
Every one is fully implemented — flipping an env var switches it on with **zero
code changes**:

| Capability | Local (default) | Production (configured) |
|---|---|---|
| Persistence | Disk JSON (`data/`) | **Firestore** (`BESKAR_DRIVER=firebase`) — full Repo impl |
| Admin auth | bcrypt + HMAC session cookie | Same, backed by Firestore `admins` collection |
| APK storage | `public/apks`, streamed via controlled endpoint | **Cloud Storage**, private objects + 5-min signed URLs |
| Image storage | `public/media` | **Cloud Storage** public objects |
| Payments | Order recorded; checkout shows honest "not configured" | **PayPal** create + capture + server re-verification |
| Payment webhooks | Endpoint live; accepts+ignores when unconfigured | **PayPal webhook** with signature verification |
| Chatbot | Deterministic **catalog-grounded** responder (works now) | Same grounding + **OpenAI-compatible LLM** for richer replies |

If a secret is missing, the platform tells the truth rather than pretending —
e.g. checkout displays "Payment provider is not configured" instead of
simulating a purchase, and the webhook acknowledges-and-ignores so PayPal
doesn't retry.

### Switching drivers
- `BESKAR_DRIVER=firebase` → Firestore persistence (needs `FIREBASE_ADMIN_*`).
- `BESKAR_STORAGE_DRIVER=firebase` → Cloud Storage for APKs/images (defaults to
  mirror `BESKAR_DRIVER`).
- These are independent: you can, for example, keep `local` persistence while
  testing, but they're normally set together in production.

> **Serverless note:** on Vercel the filesystem is ephemeral, so the `local`
> driver is for dev/preview only. Use `firebase` for any deployment where data,
> APKs, or uploads must persist.

---

## 3. Architecture

```
src/
  app/
    (public)/            Public site (route group; shares header/footer/gate)
      page.tsx           Home
      apps/              Catalog + app detail (SSR + SEO + JSON-LD)
      legal/[doc]/       Terms / Privacy / Refund / Download notice
      trust, support     Trust & Integrity, Support
    admin/
      login/             Public login page
      (dashboard)/       Server-guarded console (dashboard, apps, reviews,
                         orders, content, legal, system/audit)
    api/
      apps/              Public catalog (read-only, sanitized DTOs)
      download/[slug]/   Controlled APK download (free vs. entitled)
      checkout/          create + capture (server-side PayPal verification)
      webhooks/paypal/   Signature-verified PayPal webhook -> order finalize
      entitlements/verify Restore/verify a device entitlement token
      assistant/         Catalog-grounded chatbot (deterministic or LLM)
      health/            Liveness/readiness probe (+ integration status)
      admin/             Admin-only: apps CRUD, releases, uploads, reviews,
                         config, legal, stats, audit, orders, login/logout
  lib/
    db/                  Repo interface + local driver + FIRESTORE driver + zod
    storage/             Storage seam: local disk <-> Cloud Storage (APK/images)
    firebase/admin.ts    Admin SDK bootstrap (Firestore/Auth/Storage)
    services/            apps, ratings, paypal, orders (finalize), assistant,
                         audit, appFactory
    auth.ts              bcrypt, HMAC sessions, throttling, requireAdmin()
    rateLimit.ts         Sliding-window rate limiter (shared)
    money.ts             currency conversion & formatting (pure)
    env.ts               server-only env access (secrets never leak)
  components/            Public + admin UI (incl. Assistant chatbot widget)
  middleware.ts          Fast edge presence-check for /admin (not the boundary)
firebase/                firestore.rules, storage.rules, indexes
scripts/seed.mjs         Demo catalog seeder (valid APK/ZIP placeholders)
scripts/seed-firebase.mjs Push local dataset into Firestore + Cloud Storage
tests/                   Node built-in test runner (pure-logic unit tests)
.github/workflows/       CI (lint/typecheck/test/build) + Firebase rules deploy
```

### The repository seam
Every data access goes through the `Repo` interface (`src/lib/db/repo.ts`).
`BESKAR_DRIVER=local` uses the disk driver; `firebase` uses the Firestore driver.
Business logic and API routes are **driver-agnostic** — switching backends
requires zero call-site changes.

---

## 4. Data model

Documented in `src/lib/types.ts`. Core collections:

- **apps** — application + embedded `releases[]`, `pricing`, `rating` summary
- **reviews** — moderated; new reviews enter `hidden` (no auto social proof)
- **orders** — purchase records with server-computed amount + settlement currency
- **entitlements** — opaque tokens issued only after verified payment
- **admins** — single Super Admin (bcrypt hash; no plaintext, ever)
- **audit** — immutable log of administrative actions
- **legal**, **config** — editable public content
- **downloads** — truthful analytics events

Pricing is stored in the **base transaction currency in minor units**. Display
conversion (USD ↔ INR) is computed server-side from `BESKAR_FX_*` rates and the
UI clearly states when the display currency differs from the settlement currency.

---

### APK signing behavior
Signed and unsigned APKs are both accepted. Upload does not require a signing certificate.
When the server detects an Android APK signing structure, the release may display an informational **Verified** badge. Unsigned releases receive no warning or negative badge. This badge is not a third-party malware/safety certification.

## 5. Security model (defense in depth)

- **Authorization is server-side on every request.** `requireAdmin()` validates
  the HMAC-signed session and role. The 20-second logo gesture is *discovery
  only* — it navigates to a login page that grants nothing on its own.
- **Sessions**: httpOnly + Secure + SameSite cookies, HMAC-SHA256 signed with a
  server-only secret. Tampering invalidates the signature (verified in tests).
- **Passwords**: bcrypt (cost 12). Never stored or transmitted in plaintext.
  Login is rate-limited with lockout, and uses constant-time-ish comparisons to
  avoid user enumeration.
- **Payments**: the browser never sends the price. The server creates the PayPal
  order with its own authoritative amount, captures server-side, and re-verifies
  the captured amount + currency before issuing an entitlement.
- **Downloads**: controlled endpoint; paid apps require a server-issued,
  non-revoked entitlement bound to the app. Raw storage paths are never exposed.
- **Uploads**: admin-only, extension + magic-byte validation (APK = ZIP),
  size ceilings, and **server-computed SHA-256** (client cannot supply a fake
  checksum).
- **Input validation**: every write is validated with Zod at the trust boundary.
- **Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Permissions-Policy; `/admin` and admin APIs are `noindex`.
- **Firestore/Storage rules**: least privilege — public reads limited to
  published content; all sensitive writes are server-side via the Admin SDK.
  Default deny everywhere else.
- **Errors**: never leak stack traces or internals to clients.
- **No fake functionality**: absent secrets produce honest "not configured"
  states, never simulated success.

See section 35 of the original brief mapped to `docs/TESTING.md`.

---

## 6. Environment variables

Copy `.env.example` → `.env.local`. Key variables:

| Variable | Purpose |
|---|---|
| `BESKAR_DRIVER` | `local` or `firebase` |
| `BESKAR_SESSION_SECRET` | **Required.** HMAC secret (`openssl rand -hex 32`) |
| `BESKAR_ADMIN_EMAIL` / `_PASSWORD` | Local bootstrap admin (first boot only) |
| `BESKAR_BASE_CURRENCY`, `BESKAR_FX_USD`, `BESKAR_FX_INR` | Pricing & FX |
| `BESKAR_PAYMENTS_ENABLED` | `false` at initial launch; enables direct website purchases only when true |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client id (public) |
| `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` | PayPal secret (server-only), `sandbox`/`live` |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Web SDK config (public, not secret) |
| `FIREBASE_ADMIN_*` | Admin SDK service account (server-only secrets) |

**Never** put secrets in `NEXT_PUBLIC_*`.

---

## 7. Going to production with Firebase

1. Create a Firebase project; enable Firestore and Cloud Storage. Firebase Authentication/App Check are not required for the current server-session launch architecture.
2. The Firebase Admin/Firestore implementation is already included. Configure it from your service-account JSON with:
   `npm run firebase:configure -- /path/to/service-account.json`
   The JSON file is read externally and is not copied into the project.
3. Deploy rules & indexes: `firebase deploy --only firestore,storage`.
4. Set `BESKAR_DRIVER=firebase` + `FIREBASE_ADMIN_*` + `NEXT_PUBLIC_FIREBASE_*`.
5. Set a strong `BESKAR_ADMIN_PASSWORD` for the one-time bootstrap, sign in through the hidden logo gesture, change the password, then remove the bootstrap password.
6. Keep `BESKAR_PAYMENTS_ENABLED=false` for the initial launch.
7. `npm run build && npm start` (or deploy to your host of choice).

The Firebase driver intentionally throws a clear, actionable error until wired,
so you never ship a half-configured backend that silently fails.

---

## 8. Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Reseed the local demo catalog (valid APK placeholders) |
| `npm run seed:firebase` (`node scripts/seed-firebase.mjs`) | Push the local dataset into Firestore + Cloud Storage |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests (Node built-in runner) |
| `npm run verify` | lint + typecheck + test (used in CI) |

See **DEPLOYMENT.md** for the full GitHub → Vercel → Firebase → PayPal runbook.

---

## 9. Accessibility, performance, SEO

- Semantic HTML, keyboard focus states, reduced-motion support, sufficient
  contrast, labelled controls, 44px+ touch targets.
- SSR app pages, JSON-LD `SoftwareApplication`, Open Graph, canonical URLs,
  dynamic `sitemap.xml` + `robots.txt` (admin excluded).
- Lazy image loading, code-split client components, minimal client JS,
  in-app previews degrade gracefully offline.

---

## 10. The hidden admin gesture

Holding the **header** BESKAR logo continuously for 20 seconds routes to
`/admin/login`. There is **no visual feedback** during the hold — to a casual
user the logo is an ordinary brand mark. This is a convenience discovery layer,
**not** the security boundary; authentication and authorization are enforced
server-side regardless of how the login page is reached.
