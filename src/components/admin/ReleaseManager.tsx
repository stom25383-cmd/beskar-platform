"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { apiSend } from "@/lib/client/api";
import { AdminField, inputCls, Card, Toast } from "./ui";
import { Spinner } from "@/components/ui";
import { formatBytes } from "@/lib/money";
import type { Application, Release } from "@/lib/types";

interface UploadResult {
  apkStorageKey: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  signatureVerified?: boolean;
}

export default function ReleaseManager({ app }: { app: Application }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(
    null
  );

  const nextCode =
    app.releases.reduce((m, r) => Math.max(m, r.versionCode), 0) + 1;

  const [form, setForm] = useState({
    versionName: "",
    versionCode: nextCode,
    releaseDate: new Date().toISOString().slice(0, 10),
    minAndroid: "8.0",
    targetAndroid: "14",
    changelog: "",
    status: "published" as "published" | "unpublished",
  });

  const doUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setToast(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/apk", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");
      setUpload(json.data);
      setToast({ msg: "APK uploaded & checksummed", tone: "ok" });
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Upload failed",
        tone: "error",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const createRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upload) {
      setToast({ msg: "Upload an APK first", tone: "error" });
      return;
    }
    try {
      await apiSend(`/api/admin/apps/${app.id}/releases`, "POST", {
        ...form,
        versionCode: Number(form.versionCode),
        apkStorageKey: upload.apkStorageKey,
        fileName: upload.fileName,
        fileSizeBytes: upload.fileSizeBytes,
        sha256: upload.sha256,
        signatureVerified: upload.signatureVerified,
      });
      setToast({ msg: "Release created", tone: "ok" });
      setUpload(null);
      router.refresh();
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Failed",
        tone: "error",
      });
    }
  };

  const patchRelease = async (
    rel: Release,
    patch: Record<string, unknown>
  ) => {
    try {
      await apiSend(
        `/api/admin/apps/${app.id}/releases/${rel.id}`,
        "PATCH",
        patch
      );
      router.refresh();
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Failed",
        tone: "error",
      });
    }
  };

  const sorted = [...app.releases].sort((a, b) => b.versionCode - a.versionCode);

  return (
    <div className="space-y-6">
      {/* Existing releases */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-titanium-100">
          Releases ({app.releases.length})
        </h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-titanium-500">
            No releases yet. Upload an APK and create the first release below.
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-titanium-100">
                      v{r.versionName}
                    </span>
                    <span className="text-xs text-titanium-500">
                      build {r.versionCode}
                    </span>
                    {app.currentReleaseId === r.id && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
                        current
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                        r.status === "published"
                          ? "border-emerald-400/20 text-emerald-200"
                          : "border-white/15 text-titanium-400"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {app.currentReleaseId !== r.id &&
                      r.status === "published" && (
                        <button
                          onClick={() => patchRelease(r, { makeCurrent: true })}
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          Set current
                        </button>
                      )}
                    <button
                      onClick={() =>
                        patchRelease(r, {
                          status:
                            r.status === "published"
                              ? "unpublished"
                              : "published",
                        })
                      }
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      {r.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-titanium-500">
                  <span>{formatBytes(r.fileSizeBytes)}</span>
                  <span>Android {r.minAndroid}+</span>
                  <span>Target {r.targetAndroid}</span>
                  <span>{r.releaseDate}</span>
                </div>
                <div className="mt-2 break-all font-mono text-[10px] text-titanium-600">
                  SHA-256 {r.sha256}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New release */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-titanium-100">
          Add a release
        </h2>

        <div className="mb-5 rounded-xl border border-dashed border-white/15 bg-white/[0.01] p-5 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={doUpload}
            className="hidden"
          />
          {upload ? (
            <div className="text-sm">
              <p className="font-medium text-emerald-200">✓ {upload.fileName}</p>
              <p className="mt-1 text-titanium-400">
                {formatBytes(upload.fileSizeBytes)}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-titanium-600">
                {upload.sha256}
              </p>
              <button
                onClick={() => setUpload(null)}
                className="btn-ghost mt-3 px-3 py-1.5 text-xs"
              >
                Choose different file
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              {uploading ? <Spinner size={16} /> : null}
              {uploading ? "Uploading & hashing…" : "Upload APK"}
            </button>
          )}
          <p className="mt-3 text-xs text-titanium-500">
            SHA-256 is computed on the server. Max 300 MB. Accepts both signed and unsigned APKs. A signature is optional and only affects
            the informational Verified badge.
          </p>
        </div>

        <form onSubmit={createRelease} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label="Version name">
              <input
                required
                className={inputCls}
                value={form.versionName}
                onChange={(e) =>
                  setForm({ ...form, versionName: e.target.value })
                }
                placeholder="1.2.0"
              />
            </AdminField>
            <AdminField label="Version code" hint={`> ${nextCode - 1}`}>
              <input
                type="number"
                required
                className={inputCls}
                value={form.versionCode}
                onChange={(e) =>
                  setForm({ ...form, versionCode: Number(e.target.value) })
                }
              />
            </AdminField>
            <AdminField label="Release date">
              <input
                type="date"
                required
                className={inputCls}
                value={form.releaseDate}
                onChange={(e) =>
                  setForm({ ...form, releaseDate: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Status">
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "published" | "unpublished",
                  })
                }
              >
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Min Android">
              <input
                className={inputCls}
                value={form.minAndroid}
                onChange={(e) => setForm({ ...form, minAndroid: e.target.value })}
              />
            </AdminField>
            <AdminField label="Target Android">
              <input
                className={inputCls}
                value={form.targetAndroid}
                onChange={(e) =>
                  setForm({ ...form, targetAndroid: e.target.value })
                }
              />
            </AdminField>
          </div>
          <AdminField label="Changelog">
            <textarea
              rows={4}
              className={`${inputCls} resize-y`}
              value={form.changelog}
              onChange={(e) => setForm({ ...form, changelog: e.target.value })}
            />
          </AdminField>
          <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
            Create release
          </button>
        </form>
      </Card>

      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </div>
  );
}
