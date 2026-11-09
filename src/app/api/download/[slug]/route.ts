import { handler, fail, clientIp } from "@/lib/http";
import { repo } from "@/lib/db";
import { shortId } from "@/lib/ids";
import { resolveApkDownload } from "@/lib/storage";
import { rateLimit } from "@/lib/rateLimit";
import type { Application, Release } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Controlled download endpoint.
 *
 *  - Resolves the CURRENT published release for a published app.
 *  - Free apps: download proceeds.
 *  - Paid apps: require a valid, non-revoked entitlement token (?t=) that the
 *    SERVER issued after a verified purchase. Possession alone is not enough —
 *    we validate the token against our store and that it matches this app.
 *  - The APK's real storage location is never exposed. Local driver streams the
 *    bytes; Firebase driver redirects to a short-lived (5 min) signed URL.
 *  - Records a truthful download event + increments the counter.
 */
function resolveRelease(app: Application): Release | null {
  return (
    app.releases.find(
      (r) => r.id === app.currentReleaseId && r.status === "published"
    ) ??
    app.releases
      .filter((r) => r.status === "published")
      .sort((a, b) => b.versionCode - a.versionCode)[0] ??
    null
  );
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  return handler(async (r) => {
    // Abuse prevention: cap downloads per IP.
    const ip = clientIp(r);
    const rl = rateLimit(`download:${ip}`, 60, 60 * 60 * 1000);
    if (!rl.allowed) {
      return fail("Too many download requests. Please try again later.", 429);
    }

    const app = await repo.getAppBySlug(params.slug);
    if (!app || app.status !== "published") return fail("Not found", 404);

    const release = resolveRelease(app);
    if (!release) return fail("No published release available", 404);

    const isPaid = app.pricing.model === "paid" && app.pricing.price > 0;

    if (isPaid) {
      const url = new URL(r.url);
      const tok = url.searchParams.get("t");
      if (!tok) return fail("Purchase required", 402);
      const ent = await repo.getEntitlementByToken(tok);
      if (!ent || ent.revoked || ent.appId !== app.id) {
        return fail("Invalid or expired entitlement", 403);
      }
    }

    // Resolve via the storage abstraction (local stream vs. signed redirect).
    let resolved;
    try {
      resolved = await resolveApkDownload(release.apkStorageKey, release.fileName);
    } catch {
      // Metadata exists but no binary present (e.g. real APK not uploaded yet).
      return fail(
        "This release's package is not available for download yet.",
        409
      );
    }

    // Record analytics + increment counter (truthful) BEFORE handing off bytes.
    await repo.addDownload({
      id: shortId("dl"),
      appId: app.id,
      releaseId: release.id,
      createdAt: new Date().toISOString(),
      kind: isPaid ? "entitled" : "free",
    });
    await repo.incrementDownloadCount(app.id);

    // Firebase: redirect to a short-lived signed URL.
    if (resolved.redirectUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: resolved.redirectUrl,
          "X-BESKAR-SHA256": release.sha256,
          "X-BESKAR-Version": release.versionName,
          "Cache-Control": "private, no-store",
        },
      });
    }

    // Local: stream the bytes through the controlled endpoint.
    const data = resolved.stream!.data;
    const body = new Uint8Array(data);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${release.fileName}"`,
        "Content-Length": String(data.length),
        // Expose verifiable integrity info to the client.
        "X-BESKAR-SHA256": release.sha256,
        "X-BESKAR-Version": release.versionName,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  })(req);
}
