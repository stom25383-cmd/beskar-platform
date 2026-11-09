import "server-only";
import { repo } from "../db";
import { shortId } from "../ids";

export async function audit(params: {
  actor: string;
  action: string;
  resource: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}): Promise<void> {
  await repo.addAudit({
    id: shortId("aud"),
    actor: params.actor,
    action: params.action,
    resource: params.resource,
    before: params.before,
    after: params.after,
    ip: params.ip,
    createdAt: new Date().toISOString(),
  });
}
