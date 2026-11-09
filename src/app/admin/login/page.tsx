"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { apiSend } from "@/lib/client/api";
import { Spinner } from "@/components/ui";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}

function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiSend("/api/admin/login", "POST", { password });
      const next = params.get("next") || "/admin";
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative h-16 w-16">
            <Image src="/brand/beskar-mark.png" alt="BESKAR" fill className="object-contain" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-titanium-100">
            BESKAR Console
          </h1>
          <p className="mt-1 text-sm text-titanium-400">
            Private administration
          </p>
        </div>

        <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-7">
          <label className="block">
            <span className="mb-1.5 block text-xs text-titanium-400">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-titanium-100 focus:border-white/25 focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm"
          >
            {loading ? (
              <>
                <Spinner size={16} /> Authenticating…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-titanium-500">
          Authorized personnel only. All actions are logged.
        </p>
      </div>
    </div>
  );
}
