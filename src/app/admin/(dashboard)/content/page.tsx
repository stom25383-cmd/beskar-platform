"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client/api";
import { PageHeader, Card, AdminField, inputCls, Toast } from "@/components/admin/ui";
import { Spinner } from "@/components/ui";
import type { SiteConfig } from "@/lib/types";

export default function AdminContent() {
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(
    null
  );

  useEffect(() => {
    apiGet<SiteConfig>("/api/admin/config").then(setCfg).catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    try {
      await apiSend("/api/admin/config", "PUT", {
        maintenanceMode: cfg.maintenanceMode,
        maintenanceMessage: cfg.maintenanceMessage,
        announcement: cfg.announcement,
        announcementEnabled: cfg.announcementEnabled,
        heroHeadline: cfg.heroHeadline,
        heroSubline: cfg.heroSubline,
      });
      setToast({ msg: "Saved", tone: "ok" });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Failed", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!cfg)
    return (
      <div className="flex items-center gap-2 text-titanium-400">
        <Spinner /> Loading…
      </div>
    );

  const set = <K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) =>
    setCfg({ ...cfg, [k]: v });

  return (
    <div>
      <PageHeader
        title="Content & homepage"
        subtitle="Control the hero, announcement bar, and site availability."
      />
      <form onSubmit={save} className="max-w-2xl space-y-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-titanium-100">
            Homepage hero
          </h2>
          <div className="space-y-4">
            <AdminField label="Headline">
              <input
                className={inputCls}
                value={cfg.heroHeadline}
                onChange={(e) => set("heroHeadline", e.target.value)}
              />
            </AdminField>
            <AdminField label="Subline">
              <textarea
                rows={3}
                className={`${inputCls} resize-y`}
                value={cfg.heroSubline}
                onChange={(e) => set("heroSubline", e.target.value)}
              />
            </AdminField>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-titanium-100">
            Announcement bar
          </h2>
          <label className="mb-4 flex items-center gap-3 text-sm text-titanium-300">
            <input
              type="checkbox"
              checked={cfg.announcementEnabled}
              onChange={(e) => set("announcementEnabled", e.target.checked)}
              className="h-4 w-4 accent-titanium-200"
            />
            Show announcement bar
          </label>
          <AdminField label="Announcement text">
            <input
              className={inputCls}
              value={cfg.announcement}
              onChange={(e) => set("announcement", e.target.value)}
            />
          </AdminField>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-titanium-100">
            Availability
          </h2>
          <label className="mb-4 flex items-center gap-3 text-sm text-titanium-300">
            <input
              type="checkbox"
              checked={cfg.maintenanceMode}
              onChange={(e) => set("maintenanceMode", e.target.checked)}
              className="h-4 w-4 accent-titanium-200"
            />
            Enable maintenance mode (hides the public site)
          </label>
          <AdminField label="Maintenance message">
            <textarea
              rows={2}
              className={`${inputCls} resize-y`}
              value={cfg.maintenanceMessage}
              onChange={(e) => set("maintenanceMessage", e.target.value)}
            />
          </AdminField>
        </Card>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm"
        >
          {saving ? <Spinner size={16} /> : null}
          Save changes
        </button>
      </form>

      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </div>
  );
}
