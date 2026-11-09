import { handler, ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { recomputeRating } from "@/lib/services/ratings";
import { audit } from "@/lib/services/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["visible", "hidden", "removed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handler(async (r) => {
    const session = await requireAdmin();
    const body = await r.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 422);

    const updated = await repo.updateReview(params.id, {
      status: parsed.data.status,
    });
    if (!updated) return fail("Review not found", 404);

    await recomputeRating(updated.appId);
    await audit({
      actor: session.email,
      action: "review.moderate",
      resource: `review:${params.id}`,
      after: { status: parsed.data.status },
      ip: clientIp(r),
    });
    return ok(updated);
  })(req);
}
