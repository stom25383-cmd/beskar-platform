"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { apiSend } from "@/lib/client/api";
import { useCurrency } from "@/lib/client/currency";
import { Spinner } from "./ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  suggestions?: { label: string; slug: string }[];
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi — I'm the BESKAR Assistant. I can help you find apps, explain pricing, or guide installation. What are you looking for?",
};

export default function Assistant() {
  const pathname = usePathname();
  const { currency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // Never render inside the admin console.
  if (pathname.startsWith("/admin")) return null;

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: clean }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const data = await apiSend<{
        reply: string;
        suggestions: { label: string; slug: string }[];
      }>("/api/assistant", "POST", {
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        currency,
      });
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply, suggestions: data.suggestions },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't respond just now. Please try again, or browse /apps.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const quickPrompts = [
    "What apps do you have?",
    "Which apps are free?",
    "How do I install an APK?",
  ];

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-graphite-800/90 text-titanium-100 shadow-panel backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="9.5" r="1" fill="currentColor" />
            <circle cx="12" cy="9.5" r="1" fill="currentColor" />
            <circle cx="15" cy="9.5" r="1" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-obsidian/95 shadow-panel backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-titanium-100/10 text-titanium-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-semibold text-titanium-100">
                BESKAR Assistant
              </div>
              <div className="text-[10px] text-titanium-500">
                Grounded in the live catalog
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-titanium-100 text-graphite-900"
                      : "bg-white/[0.04] text-titanium-200"
                  }`}
                >
                  {m.content}
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.suggestions.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/apps/${s.slug}`}
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-titanium-200 transition-colors hover:border-white/25"
                      >
                        {s.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-titanium-500">
                <Spinner size={14} /> Thinking…
              </div>
            )}
            {msgs.length === 1 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-titanium-300 transition-colors hover:border-white/25"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-white/[0.06] p-3"
          >
            <div className="flex items-end gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about BESKAR apps…"
                aria-label="Message the assistant"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-titanium-100 placeholder:text-titanium-500 focus:border-white/25 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="btn-primary flex h-10 w-10 items-center justify-center rounded-xl p-0 disabled:opacity-40"
                aria-label="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 12l16-8-6 8 6 8-16-8z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-titanium-600">
              Answers are based on the live catalog. Verify details on each app&apos;s page.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
