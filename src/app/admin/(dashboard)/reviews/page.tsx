"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client/api";
import { PageHeader, Card, StatusPill, Toast } from "@/components/admin/ui";
import { Stars, Spinner } from "@/components/ui";

interface AdminReview {
  id: string;
  appId: string;
  appName: string;
  author: string;
  stars: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(
    null
  );

  const load = () =>
    apiGet<AdminReview[]>("/api/admin/reviews").then(setReviews).catch(() => setReviews([]));

  useEffect(() => {
    load();
  }, []);

  const moderate = async (id: string, status: string) => {
    try {
      await apiSend(`/api/admin/reviews/${id}`, "PATCH", { status });
      setToast({ msg: `Review ${status}`, tone: "ok" });
      load();
    } catch (e) {
      setToast({
        msg: e instanceof Error ? e.message : "Failed",
        tone: "error",
      });
    }
  };

  const filtered =
    reviews?.filter((r) => filter === "all" || r.status === filter) ?? [];

  return (
    <div>
      <PageHeader
        title="Reviews"
        subtitle="Moderate customer reviews. New reviews are hidden until approved."
      />

      <div className="mb-5 flex gap-2">
        {["all", "hidden", "visible", "reported", "removed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
              filter === f
                ? "border-white/25 bg-white/[0.06] text-titanium-100"
                : "border-white/10 text-titanium-400 hover:text-titanium-200"
            }`}
          >
            {f}
            {f === "hidden" && reviews
              ? ` (${reviews.filter((r) => r.status === "hidden").length})`
              : ""}
          </button>
        ))}
      </div>

      {!reviews && (
        <div className="flex items-center gap-2 text-titanium-400">
          <Spinner /> Loading…
        </div>
      )}

      {reviews && filtered.length === 0 && (
        <Card className="text-center text-sm text-titanium-400">
          No reviews in this view.
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <Stars value={r.stars} size={13} />
                  <span className="font-medium text-titanium-100">{r.title}</span>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-2 text-sm text-titanium-400">{r.body}</p>
                <p className="mt-2 text-xs text-titanium-500">
                  {r.author} · {r.appName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status !== "visible" && (
                  <button
                    onClick={() => moderate(r.id, "visible")}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    Approve
                  </button>
                )}
                {r.status !== "hidden" && (
                  <button
                    onClick={() => moderate(r.id, "hidden")}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    Hide
                  </button>
                )}
                {r.status !== "removed" && (
                  <button
                    onClick={() => moderate(r.id, "removed")}
                    className="rounded-xl border border-red-400/20 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </div>
  );
}
