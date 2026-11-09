"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { apiSend } from "@/lib/client/api";
import { AdminField, inputCls, Card, Toast } from "./ui";
import { Spinner } from "@/components/ui";
import type { Application, MonetizationModel, Currency } from "@/lib/types";
import ImageUpload from "./ImageUpload";

type Mode = "create" | "edit";

interface FormState {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  iconUrl: string;
  category: string;
  developer: string;
  featured: boolean;
  order: number;
  status: Application["status"];
  model: MonetizationModel;
  currency: Currency;
  priceMajor: string;
  mrpMajor: string;
  lifetime: boolean;
  freemiumNote: string;
  subscriptionNote: string;
  features: string;
  permissions: string;
  privacyNote: string;
  screenshots: { url: string; alt: string }[];
}

function toState(app?: Application): FormState {
  return {
    slug: app?.slug ?? "",
    name: app?.name ?? "",
    tagline: app?.tagline ?? "",
    description: app?.description ?? "",
    iconUrl: app?.iconUrl ?? "",
    category: app?.category ?? "",
    developer: app?.developer ?? "BESKAR",
    featured: app?.featured ?? false,
    order: app?.order ?? 0,
    status: app?.status ?? "draft",
    model: app?.pricing.model ?? "free",
    currency: app?.pricing.currency ?? "USD",
    priceMajor: app ? (app.pricing.price / 100).toString() : "0",
    mrpMajor: app ? (app.pricing.mrp / 100).toString() : "0",
    lifetime: app?.pricing.lifetime ?? true,
    freemiumNote: app?.pricing.freemiumNote ?? "",
    subscriptionNote: app?.pricing.subscriptionNote ?? "",
    features: (app?.features ?? []).join("\n"),
    permissions: (app?.permissions ?? []).join("\n"),
    privacyNote: app?.privacyNote ?? "",
    screenshots: app?.screenshots ?? [],
  };
}

export default function AppForm({
  mode,
  app,
}: {
  mode: Mode;
  app?: Application;
}) {
  const router = useRouter();
  const [s, setS] = useState<FormState>(toState(app));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(
    null
  );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const slugify = (v: string) =>
    v
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    const payload = {
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      description: s.description,
      iconUrl: s.iconUrl,
      screenshots: s.screenshots,
      category: s.category,
      features: s.features.split("\n").map((x) => x.trim()).filter(Boolean),
      pricing: {
        model: s.model,
        price: s.model === "paid" ? Math.round(Number(s.priceMajor) * 100) : 0,
        mrp: s.model === "paid" ? Math.round(Number(s.mrpMajor) * 100) : 0,
        currency: s.currency,
        lifetime: s.lifetime,
        freemiumNote: s.freemiumNote || undefined,
        subscriptionNote: s.subscriptionNote || undefined,
      },
      status: s.status,
      featured: s.featured,
      order: Number(s.order) || 0,
      privacyNote: s.privacyNote,
      permissions: s.permissions.split("\n").map((x) => x.trim()).filter(Boolean),
      developer: s.developer,
    };

    try {
      if (mode === "create") {
        const created = await apiSend<Application>("/api/admin/apps", "POST", payload);
        setToast({ msg: "Application created", tone: "ok" });
        router.push(`/admin/apps/${created.id}`);
        router.refresh();
      } else if (app) {
        await apiSend(`/api/admin/apps/${app.id}`, "PUT", payload);
        setToast({ msg: "Saved", tone: "ok" });
        router.refresh();
      }
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Save failed",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basics */}
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-titanium-100">Basics</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Name">
                <input
                  required
                  className={inputCls}
                  value={s.name}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (mode === "create" && !s.slug)
                      set("slug", slugify(e.target.value));
                  }}
                />
              </AdminField>
              <AdminField label="Slug" hint="kebab-case, URL id">
                <input
                  required
                  className={inputCls}
                  value={s.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                />
              </AdminField>
            </div>
            <AdminField label="Tagline" hint="short description">
              <input
                required
                maxLength={160}
                className={inputCls}
                value={s.tagline}
                onChange={(e) => set("tagline", e.target.value)}
              />
            </AdminField>
            <AdminField label="Full description">
              <textarea
                rows={6}
                className={`${inputCls} resize-y`}
                value={s.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Category">
                <input
                  required
                  className={inputCls}
                  value={s.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="e.g. Security"
                />
              </AdminField>
              <AdminField label="Developer">
                <input
                  className={inputCls}
                  value={s.developer}
                  onChange={(e) => set("developer", e.target.value)}
                />
              </AdminField>
            </div>
            <AdminField label="Features" hint="one per line">
              <textarea
                rows={5}
                className={`${inputCls} resize-y`}
                value={s.features}
                onChange={(e) => set("features", e.target.value)}
              />
            </AdminField>
          </div>
        </Card>

        {/* Sidebar: publish + icon */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-titanium-100">
              Publication
            </h2>
            <div className="space-y-4">
              <AdminField label="Status">
                <select
                  className={inputCls}
                  value={s.status}
                  onChange={(e) => set("status", e.target.value as Application["status"])}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                  <option value="archived">Archived</option>
                </select>
              </AdminField>
              <label className="flex items-center gap-3 text-sm text-titanium-300">
                <input
                  type="checkbox"
                  checked={s.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="h-4 w-4 accent-titanium-200"
                />
                Featured on homepage
              </label>
              <AdminField label="Order" hint="lower = earlier">
                <input
                  type="number"
                  className={inputCls}
                  value={s.order}
                  onChange={(e) => set("order", Number(e.target.value))}
                />
              </AdminField>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-titanium-100">Icon</h2>
            {s.iconUrl ? (
              <div className="mb-3 flex items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10">
                  <Image src={s.iconUrl} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => set("iconUrl", "")}
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  Replace
                </button>
              </div>
            ) : (
              <ImageUpload onUploaded={(url) => set("iconUrl", url)} label="Upload icon" />
            )}
            <AdminField label="Or paste icon URL">
              <input
                className={inputCls}
                value={s.iconUrl}
                onChange={(e) => set("iconUrl", e.target.value)}
                placeholder="/media/… or https://…"
              />
            </AdminField>
          </Card>
        </div>
      </div>

      {/* Pricing */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-titanium-100">
          Monetization & pricing
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminField label="Model">
            <select
              className={inputCls}
              value={s.model}
              onChange={(e) => set("model", e.target.value as MonetizationModel)}
            >
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
          </AdminField>
          <AdminField label="Transaction currency" hint="settlement">
            <select
              className={inputCls}
              value={s.currency}
              onChange={(e) => set("currency", e.target.value as Currency)}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
          </AdminField>
          {s.model === "paid" && (
            <>
              <AdminField label="Price" hint="major units">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={s.priceMajor}
                  onChange={(e) => set("priceMajor", e.target.value)}
                />
              </AdminField>
              <AdminField label="MRP / original" hint="0 = none">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={s.mrpMajor}
                  onChange={(e) => set("mrpMajor", e.target.value)}
                />
              </AdminField>
            </>
          )}
        </div>
        <div className="mt-4 space-y-4">
          {s.model === "paid" && (
            <label className="flex items-center gap-3 text-sm text-titanium-300">
              <input
                type="checkbox"
                checked={s.lifetime}
                onChange={(e) => set("lifetime", e.target.checked)}
                className="h-4 w-4 accent-titanium-200"
              />
              Grants lifetime access
            </label>
          )}
          {s.model === "freemium" && (
            <AdminField label="Freemium / subscription note">
              <textarea
                rows={2}
                className={`${inputCls} resize-y`}
                value={s.freemiumNote}
                onChange={(e) => set("freemiumNote", e.target.value)}
                placeholder="Describe the in-app premium offering…"
              />
            </AdminField>
          )}
        </div>
      </Card>

      {/* Screenshots */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-titanium-100">Screenshots</h2>
          <ImageUpload
            compact
            label="+ Add screenshot"
            onUploaded={(url) =>
              set("screenshots", [...s.screenshots, { url, alt: s.name }])
            }
          />
        </div>
        {s.screenshots.length === 0 ? (
          <p className="text-sm text-titanium-500">No screenshots yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {s.screenshots.map((shot, i) => (
              <div key={i} className="group relative">
                <div className="relative h-28 w-44 overflow-hidden rounded-xl border border-white/10">
                  <Image src={shot.url} alt={shot.alt} fill sizes="176px" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "screenshots",
                      s.screenshots.filter((_, j) => j !== i)
                    )
                  }
                  className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-titanium-100 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Integrity / privacy */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-titanium-100">
          Permissions & privacy
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Permissions requested" hint="one per line">
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              value={s.permissions}
              onChange={(e) => set("permissions", e.target.value)}
            />
          </AdminField>
          <AdminField label="Privacy note">
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              value={s.privacyNote}
              onChange={(e) => set("privacyNote", e.target.value)}
            />
          </AdminField>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm"
        >
          {saving ? <Spinner size={16} /> : null}
          {mode === "create" ? "Create application" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/apps")}
          className="btn-ghost px-6 py-2.5 text-sm"
        >
          Cancel
        </button>
        {mode === "create" && (
          <span className="text-xs text-titanium-500">
            Add releases & upload the APK after creating.
          </span>
        )}
      </div>

      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </form>
  );
}
