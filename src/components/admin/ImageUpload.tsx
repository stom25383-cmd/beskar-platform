"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui";

export default function ImageUpload({
  onUploaded,
  label = "Upload image",
  compact = false,
}: {
  onUploaded: (url: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => ref.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");
      onUploaded(json.data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className={`btn-ghost flex items-center gap-2 ${
          compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        {busy ? <Spinner size={14} /> : null}
        {busy ? "Uploading…" : label}
      </button>
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    </div>
  );
}
