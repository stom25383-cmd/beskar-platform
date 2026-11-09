import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BESKAR Console",
  robots: { index: false, follow: false },
};

// The admin area intentionally does NOT render the public header/footer.
// Each admin page verifies the session server-side; the login page is public.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
