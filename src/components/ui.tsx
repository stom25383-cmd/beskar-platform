"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Stars({
  value,
  size = 14,
  count,
}: {
  value: number;
  size?: number;
  count?: number;
}) {
  const full = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${value} out of 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(full);
          const half = !filled && i - 0.5 === full;
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden
              className="mr-0.5"
            >
              <defs>
                <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%" stopColor="#d7dade" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.14)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.5l2.9 6.06 6.6.62-4.98 4.42 1.47 6.5L12 17.9 5.99 20.6l1.47-6.5L2.5 9.68l6.6-.62L12 2.5z"
                fill={filled ? "#d7dade" : half ? `url(#half-${i})` : "rgba(255,255,255,0.14)"}
              />
            </svg>
          );
        })}
      </span>
      {count !== undefined && (
        <span className="text-xs text-titanium-400">
          {value.toFixed(1)}{" "}
          <span className="text-titanium-500/70">
            ({count.toLocaleString()})
          </span>
        </span>
      )}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "free" | "paid" | "freemium" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 text-titanium-300 bg-white/[0.02]",
    free: "border-emerald-400/20 text-emerald-200/90 bg-emerald-400/[0.06]",
    paid: "border-titanium-200/20 text-titanium-100 bg-titanium-100/[0.06]",
    freemium: "border-sky-400/20 text-sky-200/90 bg-sky-400/[0.06]",
    accent: "border-white/15 text-titanium-100 bg-white/[0.05]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "in" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeOpacity="0.2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
