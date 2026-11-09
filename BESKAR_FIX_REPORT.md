# BESKAR launch patch report

## Launch target
This patch is intentionally optimized for the first fast public launch: Firebase-backed application catalog + APK distribution + single-owner admin control. Direct website purchasing is disabled for this phase.

## Fixed in this build
- Firebase is the default production driver in `.env.example`.
- Direct website payments are feature-flagged OFF by default with `BESKAR_PAYMENTS_ENABLED=false`.
- Paid apps cannot be published while website payments are disabled, preventing broken purchase flows.
- Admin login is now a single password gate; the bootstrap email remains server-side only.
- Added admin password change flow; changing the password invalidates the current session.
- Admin session validation now also checks that the backing admin record still exists.
- Local development cookies remain usable over HTTP while production cookies remain Secure.
- Firestore and Storage rules are now explicitly server-only; there is one authorization model instead of a second browser-side Firebase auth model.
- Download counters use an atomic Firebase increment instead of read-modify-write.
- APK upload accepts both signed and unsigned APKs. Signing is never required.
- APK upload rejects obvious non-APK ZIPs by requiring an `AndroidManifest.xml` ZIP entry.
- Server computes SHA-256 for every uploaded APK.
- Server detects common APK v1/v2/v3 signing structures for an informational `Verified` badge. Unsigned APKs receive no warning badge.
- The `Verified` badge is not presented as malware certification or a safety guarantee.
- Pricing validation now rejects impossible combinations such as paid apps with zero price, free apps with non-zero price, and selling price above MRP.
- Fixed the project test command: `node --test tests/` was replaced with the correct test-file glob.
- Added regression tests for signed/unsigned APK behavior and checksum handling.
- Updated launch/deployment documentation to match the actual first-launch architecture.

## Deliberately deferred
- PayPal integration and direct website purchasing.
- Distributed rate limiting for multi-instance deployments.
- Full Android certificate-chain trust verification.
- Advanced purchase recovery/refunds/entitlement administration.
- Deep analytics aggregation optimizations.

These are intentionally deferred so the Firebase catalog/download launch can happen sooner.

## Verification performed
- `npm test` — **15/15 tests passed**.
- Node syntax checks for test files — passed.
- TypeScript parser sanity check was run against modified TypeScript files. Full typecheck/build could not be executed because the environment has no installed project dependencies and `npm ci --offline` reported the required packages were not cached; online `npm ci` timed out in the execution environment.

## Important deployment rule
Before production:
1. Set Firebase Admin service-account environment variables in the host.
2. Set a strong random `BESKAR_SESSION_SECRET`.
3. Set a strong `BESKAR_ADMIN_PASSWORD` for the first bootstrap only.
4. Keep `BESKAR_PAYMENTS_ENABLED=false`.
5. Upload a real APK and test the download on an Android device before publishing it publicly.
