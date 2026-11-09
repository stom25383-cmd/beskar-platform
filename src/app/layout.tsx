import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "BESKAR";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BESKAR — Precision-engineered Android applications",
    template: "%s · BESKAR",
  },
  description:
    "BESKAR is the official distribution platform for BESKAR Android applications — transparent release integrity, and a premium download experience.",
  applicationName: SITE_NAME,
  keywords: [
    "BESKAR",
    "Android apps",
    "APK download",
    "premium software",
    "transparent releases",
  ],
  authors: [{ name: "BESKAR" }],
  icons: {
    icon: [{ url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/brand/apple-touch-icon.png" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "BESKAR — Precision-engineered Android applications",
    description:
      "The official distribution platform for BESKAR Android applications.",
    url: SITE_URL,
    images: [{ url: "/brand/beskar-mark-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "BESKAR",
    description:
      "The official distribution platform for BESKAR Android applications.",
    images: ["/brand/beskar-mark-512.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="beskar-field" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
