import { handler, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin();
  const reviews = await repo.listReviews({ includeHidden: true });
  const apps = await repo.listApps({ includeHidden: true });
  const nameById = new Map(apps.map((a) => [a.id, a.name]));
  return ok(
    reviews.map((r) => ({ ...r, appName: nameById.get(r.appId) ?? "—" }))
  );
});
