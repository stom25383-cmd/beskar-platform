import { handler, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin();
  return ok(await repo.listOrders());
});
