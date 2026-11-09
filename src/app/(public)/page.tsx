import Home from "@/components/Home";
import { repo } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await repo.getSiteConfig();
  return (
    <Home
      heroHeadline={config.heroHeadline}
      heroSubline={config.heroSubline}
    />
  );
}
