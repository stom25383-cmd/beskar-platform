"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "./BrandMark";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-32 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            {/* Admin gesture disabled here to keep a single, predictable entry
                surface (the header mark). Casual users see an ordinary logo. */}
            <BrandMark size={38} withWordmark enableAdminGesture={false} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-titanium-400">
              A curated distribution platform for BESKAR applications. Integrity-checked
              releases, transparent integrity, precision-built for Android.
            </p>
          </div>

          <FooterCol
            title="Platform"
            links={[
              { href: "/apps", label: "All applications" },
              { href: "/apps?sort=new", label: "New releases" },
              { href: "/apps?filter=free", label: "Free apps" },
              { href: "/trust", label: "Trust & integrity" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { href: "/legal/terms", label: "Terms & Conditions" },
              { href: "/legal/privacy", label: "Privacy Policy" },
              { href: "/legal/refund", label: "Refund Policy" },
              { href: "/legal/download-notice", label: "Download Notice" },
            ]}
          />
          <FooterCol
            title="Support"
            links={[
              { href: "/support", label: "Contact & support" },
              { href: "/trust", label: "Report an issue" },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-8 text-xs text-titanium-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BESKAR. All rights reserved.</p>
          <p className="max-w-md text-titanium-500/80">
            Applications are distributed outside the Google Play Store. Review
            each release&apos;s integrity details before installation.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider2 text-titanium-300">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-titanium-400 transition-colors hover:text-titanium-100"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
