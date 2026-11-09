import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { audit } from "@/lib/services/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["published", "unpublished"]).optional(),
  changelog: z.string().max(5000).optional(),
  makeCurrent: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; releaseId: string } }
) {
  return handler(async (r) => {
    const session = await requireAdmin();
    const app = await repo.getApp(params.id);
    if (!app) return fail("Application not found", 404);
    const idx = app.releases.findIndex((x) => x.id === params.releaseId);
    if (idx === -1) return fail("Release not found", 404);

    const body = await r.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 422);

    const releases = [...app.releases];
    const before = { ...releases[idx] };
    releases[idx] = {
      ...releases[idx],
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.changelog !== undefined
        ? { changelog: parsed.data.changelog }
        : {}),
    };

    let currentReleaseId = app.currentReleaseId;
    if (parsed.data.makeCurrent && releases[idx].status === "published") {
      currentReleaseId = releases[idx].id;
    }
    // If we just unpublished the current release, promote the newest published.
    if (
      releases[idx].status === "unpublished" &&
      currentReleaseId === releases[idx].id
    ) {
      const nextCurrent = releases
        .filter((x) => x.status === "published")
        .sort((a, b) => b.versionCode - a.versionCode)[0];
      currentReleaseId = nextCurrent ? nextCurrent.id : null;
    }

    await repo.updateApp(params.id, { releases, currentReleaseId });
    await audit({
      actor: session.email,
      action: "release.update",
      resource: `app:${app.slug}:${before.versionName}`,
      before: { status: before.status },
      after: { status: releases[idx].status, current: currentReleaseId === releases[idx].id },
      ip: clientIp(r),
    });
    return ok(releases[idx]);
  })(req);
}
