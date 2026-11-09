# BESKAR — Deployment Runbook (GitHub → Vercel → Firebase → PayPal)

This is the exact sequence to take BESKAR from the repo to a production
deployment. Nothing here requires editing application code — only configuration.

---

## 0. Prerequisites

- A GitHub repository (push this project to it).
- A Vercel account or another Node-compatible production host.
- A Firebase project with Firestore and Cloud Storage.
- PayPal is **not required for the initial launch**.
- (Optional) An OpenAI-compatible API key for the richer chatbot.

---

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "BESKAR platform"
git branch -M main
git remote add origin https://github.com/<you>/beskar-platform.git
git push -u origin main
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + test + build on every
push/PR. No secrets are needed for CI — the build uses the local driver with a
throwaway session secret.

---

## 2. Firebase setup

1. **Create the project** at <https://console.firebase.google.com>.
2. **Enable Firestore** (Native mode) and **Cloud Storage**.
3. **Create a service account key**: Project Settings → Service accounts →
   *Generate new private key*. You'll get a JSON file with:
   - `project_id`   → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key`  → `FIREBASE_ADMIN_PRIVATE_KEY` (keep the `\n` escapes)
4. **Note your Storage bucket** (e.g. `your-project.appspot.com`) →
   `FIREBASE_STORAGE_BUCKET`.
5. **Deploy security rules & indexes** (from repo root):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes,storage \
     --project your-project-id
   ```
   (Or let `.github/workflows/firebase-rules.yml` do it — set repo secret
   `FIREBASE_TOKEN` from `firebase login:ci` and repo variable
   `FIREBASE_PROJECT_ID`.)
6. **Seed Firestore + Storage** with the demo catalog (optional):
   ```bash
   npm run seed            # builds data/beskar.json + APK placeholders
   npm run seed:firebase   # uploads to Storage, writes Firestore docs
   ```
   Or skip seeding and create your first app entirely from the admin console.

---

## 3. Vercel setup

1. **Import the GitHub repo** into Vercel (Framework preset: Next.js — auto).
2. **Set Environment Variables** (Project Settings → Environment Variables).
   Minimum for production:
   ```
   BESKAR_DRIVER=firebase
   BESKAR_STORAGE_DRIVER=firebase
   BESKAR_SESSION_SECRET=<openssl rand -hex 32>
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   NEXT_PUBLIC_SITE_NAME=BESKAR
   BESKAR_BASE_CURRENCY=USD
   BESKAR_FX_USD=1
   BESKAR_FX_INR=83.4

   FIREBASE_ADMIN_PROJECT_ID=...
   FIREBASE_ADMIN_CLIENT_EMAIL=...
   FIREBASE_ADMIN_PRIVATE_KEY=...        # paste with literal \n newlines
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com

   NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_ENV=live
   PAYPAL_WEBHOOK_ID=...

   # First-boot admin (remove after first sign-in)
   BESKAR_ADMIN_EMAIL=owner@yourdomain.com
   BESKAR_ADMIN_PASSWORD=<strong-password>

   # Optional richer chatbot
   BESKAR_AI_API_KEY=...
   BESKAR_AI_MODEL=gpt-4o-mini
   ```
3. **Deploy.** Vercel builds with `next build` and serves the app.
4. **Add your custom domain** (Project → Domains) and point DNS as instructed.
   Update `NEXT_PUBLIC_SITE_URL` to the final URL and redeploy.
5. **Preview deployments** work automatically for PRs — they share the same env
   unless you scope variables to Production only (recommended for live PayPal).

---

## 4. PayPal setup

1. In the **PayPal Developer Dashboard**, create a REST app to get the
   **Client ID** and **Secret**. Use Sandbox creds first, then Live.
2. Set `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`.
3. **Create a webhook** pointing to:
   ```
   https://your-domain.com/api/webhooks/paypal
   ```
   Subscribe to events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `CHECKOUT.ORDER.COMPLETED`
   Copy the **Webhook ID** → `PAYPAL_WEBHOOK_ID`.
4. Test a sandbox purchase end-to-end: the server creates the order with its own
   authoritative amount, captures on approval, re-verifies amount + currency,
   and issues an entitlement. The webhook independently finalizes the order if
   the buyer closes the tab mid-flow.

---

## 5. First admin sign-in

1. Hold the BESKAR header logo continuously for 20 seconds. The gesture has no visual feedback.
2. Enter the bootstrap admin password. The email is an internal bootstrap identity and is not requested in the UI.
3. **Change the password** from System & Audit.
4. Remove `BESKAR_ADMIN_PASSWORD` from the hosting environment after the admin record exists.

Firebase Authentication is intentionally not required for the initial admin session architecture. The server uses the single bcrypt-protected admin record and HMAC-signed httpOnly session.

---

## 6. Post-deploy checklist

- [ ] `GET /api/health` returns `status: ok` and the integrations you configured
      show `true`.
- [ ] Upload a real APK for each app and publish a release. Signed and unsigned APKs are both accepted; unsigned releases receive no warning badge.
- [ ] Replace the legal template text (`/admin/legal`) with reviewed wording.
- [ ] Confirm `robots.txt` and `sitemap.xml` resolve; admin is `noindex`.
- [ ] Run a live (small) PayPal purchase and verify the entitlement + download.
- [ ] Set FX rates (`BESKAR_FX_*`) to your current values and a refresh cadence.
- [ ] Consider a shared rate-limit store (Upstash Redis) if you scale to many
      instances (see README §5).

---

## 7. Scaling notes (documented, not required for launch)

- **Rate limiting** is in-memory per instance. For strict global limits across
  many serverless instances, back `src/lib/rateLimit.ts` with Upstash Redis or a
  Firestore counter — the call sites don't change.
- **FX rates** are static env values by design (no fabricated live rates). Wire a
  scheduled job to update them, or a provider call in `env.fx()`.
- **Downloads at scale**: the Firebase driver already serves APKs via signed URLs
  (offloading bytes to Cloud Storage/CDN) rather than through the function.
