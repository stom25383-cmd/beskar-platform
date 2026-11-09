// Editable legal placeholders. The owner overrides these via the admin panel;
// these defaults render until then. They are intentionally marked as templates
// requiring legal review — no fabricated guarantees.

export interface LegalDefault {
  id: "terms" | "privacy" | "refund" | "download-notice";
  title: string;
  body: string;
}

export const LEGAL_DEFAULTS: Record<string, LegalDefault> = {
  terms: {
    id: "terms",
    title: "Terms & Conditions",
    body: `TEMPLATE — REQUIRES LEGAL REVIEW BEFORE PUBLICATION.

1. Acceptance
By accessing BESKAR and downloading any application, you agree to these Terms.

2. Applications
All applications distributed on BESKAR are created and approved by BESKAR. Applications are provided for use on Android devices outside the Google Play Store.

3. Licenses
Each application is licensed, not sold. Paid applications grant the access described on the application's page (e.g. lifetime access) subject to the application's commercial terms.

4. Acceptable use
You agree not to redistribute, reverse engineer beyond what is permitted by law, or misuse the applications.

5. Availability
BESKAR may update, unpublish, or remove applications at its discretion.

6. Disclaimer
Applications are provided "as is" to the extent permitted by law. BESKAR does not make unverifiable safety guarantees; verifiable integrity details are published per release.

7. Contact
See the Support page for how to reach BESKAR.`,
  },
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    body: `TEMPLATE — REQUIRES LEGAL REVIEW BEFORE PUBLICATION.

1. Overview
BESKAR is designed to be privacy-conscious. Browsing the catalog and downloading free applications does not require an account.

2. Information we process
- Anonymous download and analytics events used to operate and improve the platform.
- Purchase records necessary to verify payments and grant entitlements.
- Reviews you choose to submit (name and content you provide).

3. Payments
Payments are processed by our payment provider (e.g. PayPal). BESKAR does not store your full payment credentials.

4. Entitlements
After a verified purchase, an anonymous entitlement token is stored on your device so you can re-download without an account.

5. Your choices
You may request information about data associated with a purchase reference via Support.

6. Contact
See the Support page.`,
  },
  refund: {
    id: "refund",
    title: "Refund Policy",
    body: `TEMPLATE — REQUIRES LEGAL REVIEW BEFORE PUBLICATION.

Because BESKAR distributes digital software with immediate access, refunds are handled case by case. If an application does not function as described, contact Support with your purchase reference and device details. BESKAR will review eligible requests in good faith and in accordance with applicable consumer law.`,
  },
  "download-notice": {
    id: "download-notice",
    title: "Download Notice",
    body: `IMPORTANT — PLEASE READ BEFORE INSTALLING.

Applications on BESKAR are distributed as APK files outside the Google Play Store. To install, your Android device may require you to permit installation from this source.

For every release, BESKAR publishes:
- Version and build number
- Package size
- Minimum Android version
- A SHA-256 checksum you can verify after download

BESKAR does not claim applications are "100% malware-free" or "approved by Google". We publish verifiable facts so you can make an informed decision. Always verify the checksum shown on the application's Integrity tab against your downloaded file.`,
  },
};
