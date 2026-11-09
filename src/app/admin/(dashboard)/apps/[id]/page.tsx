import { notFound } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppEditor from "@/components/admin/AppEditor";

export const dynamic = "force-dynamic";

export default async function EditAppPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const app = await repo.getApp(params.id);
  if (!app) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/apps"
          className="text-xs text-titanium-400 hover:text-titanium-200"
        >
          ← All applications
        </Link>
      </div>
      <AppEditor app={app} />
    </div>
  );
}
