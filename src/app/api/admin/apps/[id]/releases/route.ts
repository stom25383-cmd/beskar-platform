import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { releaseInputSchema } from "@/lib/db/schema";
import { audit } from "@/lib/services/audit";
import { shortId } from "@/lib/ids";
import type { Release } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Add a release to an app (metadata created after APK upload). */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handler(async (r) => {
    const session = await requireAdmin();
    const app = await repo.getApp(params.id);
    if (!app) return fail("Application not found", 404);

    const body = await r.json().catch(() => null);
    const parsed = releaseInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || "Invalid release", 422);
    }

    // Enforce monotonic version codes.
    const maxCode = app.releases.reduce(
      (m, x) => Math.max(m, x.versionCode),
      0
    );
    if (parsed.data.versionCode <= maxCode) {
      return fail(
        `Version code must be greater than the current highest (${maxCode}).`,
        409
      );
    }

    const release: Release = { id: shortId("rel"), ...parsed.data };
    const releases = [...app.releases, release];
    const currentReleaseId =
      release.status === "published" ? release.id : app.currentReleaseId;

    await repo.updateApp(params.id, { releases, currentReleaseId });
    await audit({
      actor: session.email,
      action: "release.create",
      resource: `app:${app.slug}`,
      after: {
        versionName: release.versionName,
        versionCode: release.versionCode,
        status: release.status,
      },
      ip: clientIp(r),
    });
    return ok(release);
  })(req);
}
