"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiSend } from "@/lib/client/api";
import AppForm from "./AppForm";
import ReleaseManager from "./ReleaseManager";
import { Card, StatusPill, Toast } from "./ui";
import type { Application } from "@/lib/types";

export default function AppEditor({ app }: { app: Application }) {
  const router = useRouter();
  const [tab, setTab] = useState<"details" | "releases" | "danger">("details");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(
    null
  );
  const [confirm, setConfirm] = useState("");

  const del = async () => {
    if (confirm !== app.slug) return;
    try {
      await apiSend(`/api/admin/apps/${app.id}`, "DELETE");
      router.push("/admin/apps");
      router.refresh();
    } catch (e) {
      setToast({
        msg: e instanceof Error ? e.message : "Delete failed",
        tone: "error",
      });
    }
  };

  const quickStatus = async (status: Application["status"]) => {
    try {
      // Reuse PUT with full current payload minus recomputed fields.
      await apiSend(`/api/admin/apps/${app.id}`, "PUT", {
        slug: app.slug,
        name: app.name,
        tagline: app.tagline,
        description: app.description,
        iconUrl: app.iconUrl,
        screenshots: app.screenshots,
        category: app.category,
        features: app.features,
        pricing: app.pricing,
        status,
        featured: app.featured,
        order: app.order,
        privacyNote: app.privacyNote,
        permissions: app.permissions,
        developer: app.developer,
      });
      setToast({ msg: `Status → ${status}`, tone: "ok" });
      router.refresh();
    } catch (e) {
      setToast({
        msg: e instanceof Error ? e.message : "Failed",
        tone: "error",
      });
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-graphite-800">
            {app.iconUrl && (
              <Image src={app.iconUrl} alt="" fill sizes="56px" className="object-cover" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-titanium-100">
                {app.name}
              </h1>
              <StatusPill status={app.status} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-titanium-500">
              <span>/{app.slug}</span>
              <Link
                href={`/apps/${app.slug}`}
                target="_blank"
                className="hover:text-titanium-300"
              >
                View public page ↗
              </Link>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {app.status !== "published" ? (
            <button
              onClick={() => quickStatus("published")}
              className="btn-primary px-4 py-2 text-sm"
            >
              Publish
            </button>
          ) : (
            <button
              onClick={() => quickStatus("unpublished")}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Unpublish
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-white/[0.06]">
        {(
          [
            ["details", "Details"],
            ["releases", `Releases (${app.releases.length})`],
            ["danger", "Danger zone"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative px-4 py-3 text-sm transition-colors ${
              tab === k
                ? "text-titanium-100"
                : "text-titanium-400 hover:text-titanium-200"
            }`}
          >
            {label}
            {tab === k && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-titanium-100" />
            )}
          </button>
        ))}
      </div>

      {tab === "details" && <AppForm mode="edit" app={app} />}
      {tab === "releases" && <ReleaseManager app={app} />}
      {tab === "danger" && (
        <Card className="max-w-xl border-red-400/10">
          <h2 className="text-sm font-semibold text-red-200">Delete application</h2>
          <p className="mt-2 text-sm text-titanium-400">
            This permanently removes the application and its release metadata.
            This cannot be undone. Type{" "}
            <span className="font-mono text-titanium-200">{app.slug}</span> to
            confirm.
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-titanium-100 focus:border-red-400/40 focus:outline-none"
            placeholder={app.slug}
          />
          <button
            onClick={del}
            disabled={confirm !== app.slug}
            className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-40"
          >
            Delete permanently
          </button>
        </Card>
      )}

      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </div>
  );
}
