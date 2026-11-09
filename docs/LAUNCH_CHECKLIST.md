# BESKAR initial launch checklist

This first launch is intentionally limited to **free/freemium APK distribution + Firebase-backed administration**. Direct website purchases are disabled until explicitly enabled.

1. Set `BESKAR_DRIVER=firebase` and `BESKAR_STORAGE_DRIVER=firebase`.
2. Set a long random `BESKAR_SESSION_SECRET`.
3. Set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, and `FIREBASE_STORAGE_BUCKET`.
4. Set `BESKAR_ADMIN_EMAIL` and a strong `BESKAR_ADMIN_PASSWORD` once for bootstrap.
5. Deploy Firestore/Storage rules.
6. Sign in through the hidden logo gesture and immediately change the admin password.
7. Remove the bootstrap password from the hosting environment after the password change.
8. Keep `BESKAR_PAYMENTS_ENABLED=false` for this launch.
9. Do not publish paid website-purchase apps while payments are disabled.
10. Upload only real APK files. Both signed and unsigned APKs are accepted; signature detection is informational and unsigned files receive **no warning badge**.
11. Publish a release only after checking the download manually on an Android device.
12. Verify `/api/health` reports the Firebase datastore as reachable.
