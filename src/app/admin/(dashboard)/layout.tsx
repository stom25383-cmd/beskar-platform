import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

// Server-side authorization guard. This is the real boundary — the HMAC-signed
// session cookie is verified here on every render. Middleware only does a fast
// presence check; this validates authenticity and role.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    redirect("/admin/login");
  }
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
