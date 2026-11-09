import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trust & Integrity",
  description:
    "How BESKAR verifies releases: server-computed SHA-256 checksums, transparent metadata, and honest, verifiable claims.",
};

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <span className="text-[11px] uppercase tracking-wider2 text-titanium-500">
        Trust & Integrity
      </span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-titanium-100 sm:text-4xl">
        Verifiable by design
      </h1>
      <p className="mt-4 max-w-2xl text-titanium-400">
        Because BESKAR applications are distributed outside the Play Store, we
        treat transparency as a product feature. We publish verifiable facts —
        not unverifiable guarantees.
      </p>

      <div className="mt-12 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.title} className="glass rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-titanium-100">{s.title}</h2>
            <p className="mt-3 leading-relaxed text-titanium-400">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="glass mt-8 rounded-2xl border-amber-400/10 p-8">
        <h2 className="text-lg font-semibold text-titanium-100">
          What we do <span className="text-amber-200/80">not</span> claim
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-titanium-400">
          <li>· We do not claim any app is “100% malware-free”.</li>
          <li>· We do not claim apps are “approved by Google”.</li>
          <li>· We do not fabricate ratings, reviews, or download counts.</li>
        </ul>
        <p className="mt-4 text-sm text-titanium-400">
          Instead, verify each release yourself using the SHA-256 checksum on the
          application&apos;s Integrity tab.
        </p>
      </div>

      <div className="mt-10 text-center">
        <Link href="/apps" className="btn-primary px-7 py-3 text-sm">
          Browse published applications
        </Link>
      </div>
    </div>
  );
}

const SECTIONS = [
  {
    title: "Server-computed checksums",
    body: "When a release is uploaded, BESKAR computes its SHA-256 hash on the server — the client can never supply a fake checksum. That hash is published on the application's Integrity tab and returned as a header on every download, so you can verify the exact bytes you received.",
  },
  {
    title: "Complete release history",
    body: "Every published version stays on record with its version name, build number, size, minimum Android version, and changelog. You can review the full history before deciding to install or update.",
  },
  {
    title: "Controlled distribution",
    body: "Downloads are served through a controlled endpoint rather than a raw public folder. Paid applications require a server-issued entitlement, verified independently of anything the browser claims.",
  },
  {
    title: "Honest pricing",
    body: "Prices can be shown in USD or INR, but we always tell you the currency in which payment actually settles — we never imply a conversion is the settlement currency.",
  },
];
