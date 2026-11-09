import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaintenanceGate from "@/components/MaintenanceGate";
import Assistant from "@/components/Assistant";
import { repo } from "@/lib/db";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await repo.getSiteConfig();
  return (
    <MaintenanceGate
      maintenance={config.maintenanceMode}
      message={config.maintenanceMessage}
      announcement={config.announcementEnabled ? config.announcement : ""}
    >
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <Assistant />
    </MaintenanceGate>
  );
}
