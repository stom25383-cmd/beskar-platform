import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with BESKAR applications, downloads, and purchases.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-titanium-100">
        Support
      </h1>
      <p className="mt-4 text-titanium-400">
        We&apos;re here to help with installations, downloads, and purchases.
      </p>

      <div className="glass mt-8 rounded-2xl p-8">
        <h2 className="text-lg font-semibold text-titanium-100">Contact</h2>
        <p className="mt-3 text-sm text-titanium-400">
          Email:{" "}
          <a
            href="mailto:support@beskar.app"
            className="text-titanium-200 underline"
          >
            support@beskar.app
          </a>
          {"  "}
          <span className="text-titanium-500">
            (placeholder — owner to configure)
          </span>
        </p>
        <p className="mt-2 text-sm text-titanium-400">
          For purchase issues, include your purchase reference and device model.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {FAQ.map((f) => (
          <details
            key={f.q}
            className="glass group rounded-2xl p-6 [&_summary]:cursor-pointer"
          >
            <summary className="flex items-center justify-between text-titanium-100">
              <span className="font-medium">{f.q}</span>
              <span className="text-titanium-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-titanium-400">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

const FAQ = [
  {
    q: "How do I install an APK from BESKAR?",
    a: "Download the APK, then open it on your Android device. You may need to allow installation from this source in your device settings. Always verify the SHA-256 checksum on the Integrity tab.",
  },
  {
    q: "I paid but can't download — what now?",
    a: "Your entitlement is saved on the device you purchased from. If you switched devices or cleared storage, contact Support with your purchase reference to restore access.",
  },
  {
    q: "Which currencies can I pay in?",
    a: "Prices display in USD or INR based on your preference. The application page always states the currency in which payment actually settles.",
  },
  {
    q: "Are these apps safe?",
    a: "We publish verifiable integrity details (checksums, versions, sizes) for every release rather than making unverifiable guarantees. Review the Trust & Integrity page for details.",
  },
];
