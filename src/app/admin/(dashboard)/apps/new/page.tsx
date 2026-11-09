import { PageHeader } from "@/components/admin/ui";
import AppForm from "@/components/admin/AppForm";

export const dynamic = "force-dynamic";

export default function NewAppPage() {
  return (
    <div>
      <PageHeader
        title="New application"
        subtitle="Enter metadata now; upload the APK and manage releases after creating."
      />
      <AppForm mode="create" />
    </div>
  );
}
