"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client/api";
import type { RatingSummary } from "@/lib/types";
import { Stars, Spinner } from "./ui";

interface PublicReview {
  id: string;
  author: string;
  stars: number;
  title: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export default function ReviewSection({
  slug,
  rating,
}: {
  slug: string;
  rating: RatingSummary;
}) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiGet<PublicReview[]>(`/api/apps/${slug}/reviews`)
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [slug]);

  return (
    <section className="mt-12 border-t border-white/[0.06] pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-titanium-100">
          Ratings & reviews
        </h2>
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-4 py-2 text-sm">
          {open ? "Close" : "Write a review"}
        </button>
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-[220px_1fr]">
        {/* Summary */}
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-4xl font-semibold text-titanium-100">
            {rating.count ? rating.average.toFixed(1) : "—"}
          </div>
          <div className="mt-2 flex justify-center">
            <Stars value={rating.average} size={16} />
          </div>
          <div className="mt-2 text-xs text-titanium-400">
            {rating.count} {rating.count === 1 ? "rating" : "ratings"}
          </div>
          <div className="mt-4 space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((s) => {
              const c = rating.distribution[String(s) as "5"] ?? 0;
              const pct = rating.count ? (c / rating.count) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-titanium-500">{s}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-titanium-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* List / form */}
        <div>
          {open && <ReviewForm slug={slug} onDone={() => setOpen(false)} />}

          {!reviews && (
            <div className="flex items-center gap-2 py-8 text-titanium-400">
              <Spinner size={16} /> Loading reviews…
            </div>
          )}

          {reviews && reviews.length === 0 && (
            <div className="glass rounded-2xl px-6 py-10 text-center">
              <p className="text-titanium-200">No reviews yet</p>
              <p className="mt-1 text-sm text-titanium-400">
                Be the first to share your experience.
              </p>
            </div>
          )}

          {reviews && reviews.length > 0 && (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Stars value={r.stars} size={13} />
                      <span className="text-sm font-medium text-titanium-100">
                        {r.title}
                      </span>
                    </div>
                    {r.verifiedPurchase && (
                      <span className="text-[10px] uppercase tracking-wide text-emerald-200/80">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-titanium-400">
                    {r.body}
                  </p>
                  <p className="mt-3 text-xs text-titanium-500">
                    {r.author} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [author, setAuthor] = useState("");
  const [stars, setStars] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setErr(null);
    try {
      await apiSend(`/api/apps/${slug}/reviews`, "POST", {
        author,
        stars,
        title,
        body,
      });
      setState("done");
    } catch (e) {
      setState("error");
      setErr(e instanceof Error ? e.message : "Failed to submit");
    }
  };

  if (state === "done") {
    return (
      <div className="glass mb-6 rounded-2xl p-6 text-center">
        <p className="font-medium text-titanium-100">Thank you</p>
        <p className="mt-1 text-sm text-titanium-400">
          Your review was submitted and will appear after moderation.
        </p>
        <button onClick={onDone} className="btn-ghost mt-4 px-4 py-2 text-sm">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass mb-6 space-y-4 rounded-2xl p-6">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStars(s)}
            aria-label={`${s} stars`}
            className="p-0.5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M12 2.5l2.9 6.06 6.6.62-4.98 4.42 1.47 6.5L12 17.9 5.99 20.6l1.47-6.5L2.5 9.68l6.6-.62L12 2.5z"
                fill={s <= stars ? "#d7dade" : "rgba(255,255,255,0.14)"}
              />
            </svg>
          </button>
        ))}
      </div>
      <Field label="Your name">
        <input
          required
          maxLength={60}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="beskar-input"
        />
      </Field>
      <Field label="Title">
        <input
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="beskar-input"
        />
      </Field>
      <Field label="Review">
        <textarea
          required
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="beskar-input resize-none"
        />
      </Field>
      {err && <p className="text-sm text-red-300">{err}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          {state === "sending" ? "Submitting…" : "Submit review"}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost px-5 py-2.5 text-sm">
          Cancel
        </button>
      </div>
      <style jsx>{`
        :global(.beskar-input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #e8eaed;
        }
        :global(.beskar-input:focus) {
          outline: none;
          border-color: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-titanium-400">{label}</span>
      {children}
    </label>
  );
}
