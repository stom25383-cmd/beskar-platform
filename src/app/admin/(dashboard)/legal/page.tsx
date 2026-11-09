"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client/api";
import { PageHeader, Card, inputCls, Toast } from "@/components/admin/ui";
import { Spinner } from "@/components/ui";
import { LEGAL_DEFAULTS } from "@/lib/legalDefaults";
import type { LegalDoc } from "@/lib/types";

const DOCS = [
  { id: "terms", label: "Terms & Conditions" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "refund", label: "Refund Policy" },
  { id: "download-notice", label: "Download Notice" },
] as const;

export default function AdminLegal() {
  const [stored, setStored] = useState<Record<string, LegalDoc>>({});
  const [active, setActive] = useState<string>("terms");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(
    null
  );

  useEffect(() => {
    apiGet<LegalDoc[]>("/api/admin/legal")
      .then((docs) => {
        const map: Record<string, LegalDoc> = {};
        docs.forEach((d) => (map[d.id] = d));
        setStored(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = stored[active];
    const def = LEGAL_DEFAULTS[active];
    setTitle(s?.title ?? def.title);
    setBody(s?.body ?? def.body);
  }, [active, stored]);

  const save = async () => {
    setSaving(true);
    try {
      const doc = await apiSend<LegalDoc>("/api/admin/legal", "PUT", {
        id: active,
        title,
        body,
      });
      setStored({ ...stored, [active]: doc });
      setToast({ msg: "Saved", tone: "ok" });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Failed", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-titanium-400">
        <Spinner /> Loading…
      </div>
    );

  return (
    <div>
      <PageHeader
        title="Legal documents"
        subtitle="Edit the customer-facing legal pages. Templates require legal review before publication."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-1">
          {DOCS.map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d.id)}
              className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                active === d.id
                  ? "bg-white/[0.06] text-titanium-100"
                  : "text-titanium-400 hover:bg-white/[0.03]"
              }`}
            >
              {d.label}
              {stored[d.id] ? (
                <span className="ml-2 text-[10px] text-emerald-300">edited</span>
              ) : (
                <span className="ml-2 text-[10px] text-titanium-600">default</span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <div className="space-y-4">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              rows={22}
              className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm"
            >
              {saving ? <Spinner size={16} /> : null}
              Save document
            </button>
          </div>
        </Card>
      </div>

      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </div>
  );
}
