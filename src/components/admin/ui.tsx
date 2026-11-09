"use client";

import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-titanium-100">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-titanium-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[11px] uppercase tracking-wider2 text-titanium-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-titanium-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-titanium-400">{hint}</div>}
    </div>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-titanium-300">{label}</span>
        {hint && <span className="text-[10px] text-titanium-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-titanium-100 placeholder:text-titanium-500 focus:border-white/25 focus:outline-none";

export function Toast({
  message,
  tone = "ok",
}: {
  message: string;
  tone?: "ok" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-5 py-3 text-sm shadow-panel ${
        tone === "ok"
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
          : "border-red-400/20 bg-red-400/10 text-red-100"
      }`}
      role="status"
    >
      {message}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "border-emerald-400/20 text-emerald-200 bg-emerald-400/10",
    draft: "border-amber-400/20 text-amber-200 bg-amber-400/10",
    unpublished: "border-white/15 text-titanium-300 bg-white/[0.04]",
    archived: "border-white/10 text-titanium-500 bg-white/[0.02]",
    visible: "border-emerald-400/20 text-emerald-200 bg-emerald-400/10",
    hidden: "border-amber-400/20 text-amber-200 bg-amber-400/10",
    removed: "border-red-400/20 text-red-200 bg-red-400/10",
    reported: "border-red-400/20 text-red-200 bg-red-400/10",
    paid: "border-emerald-400/20 text-emerald-200 bg-emerald-400/10",
    pending: "border-amber-400/20 text-amber-200 bg-amber-400/10",
    failed: "border-red-400/20 text-red-200 bg-red-400/10",
    created: "border-white/15 text-titanium-300 bg-white/[0.04]",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${
        map[status] || "border-white/10 text-titanium-400"
      }`}
    >
      {status}
    </span>
  );
}
