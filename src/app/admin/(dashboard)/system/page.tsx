"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client/api";
import { PageHeader, Card } from "@/components/admin/ui";
import { Spinner } from "@/components/ui";
import type { AuditEntry } from "@/lib/types";

export default function AdminSystem() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [pubcfg, setPubcfg] = useState<{
    paypal: { configured: boolean; env: string };
    baseCurrency: string;
  } | null>(null);

  useEffect(() => {
    apiGet<AuditEntry[]>("/api/admin/audit").then(setAudit).catch(() => setAudit([]));
    apiGet("/api/public-config").then(setPubcfg as any).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title="System & audit"
        subtitle="Configuration status and a complete, immutable log of administrative actions."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-[11px] uppercase tracking-wider2 text-titanium-500">
            Payment provider
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                pubcfg?.paypal.configured ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-sm text-titanium-200">
              PayPal —{" "}
              {pubcfg?.paypal.configured
                ? `configured (${pubcfg.paypal.env})`
                : "not configured"}
            </span>
          </div>
          {!pubcfg?.paypal.configured && (
            <p className="mt-2 text-xs text-titanium-500">
              Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to enable
              live checkout.
            </p>
          )}
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider2 text-titanium-500">
            Base currency
          </div>
          <div className="mt-2 text-sm text-titanium-200">
            {pubcfg?.baseCurrency ?? "—"}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider2 text-titanium-500">
            Admin role
          </div>
          <div className="mt-2 text-sm text-titanium-200">
            Single Super Admin
          </div>
          <p className="mt-1 text-xs text-titanium-500">
            No public registration or invitations.
          </p>
        </Card>
      </div>


      <Card>
        <h2 className="text-sm font-semibold text-titanium-100">Change admin password</h2>
        <p className="mt-1 text-xs text-titanium-500">After a successful change, the current session is signed out.</p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault(); setPasswordBusy(true); setPasswordMsg(null);
            try {
              await apiSend("/api/admin/password", "POST", { currentPassword, newPassword });
              setPasswordMsg("Password changed. Please sign in again.");
              setCurrentPassword(""); setNewPassword("");
              setTimeout(() => { window.location.href = "/admin/login"; }, 700);
            } catch (err) { setPasswordMsg(err instanceof Error ? err.message : "Password change failed"); }
            finally { setPasswordBusy(false); }
          }}
        >
          <input type="password" required minLength={1} placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-titanium-100 outline-none" />
          <input type="password" required minLength={12} placeholder="New password (12+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-titanium-100 outline-none" />
          <button disabled={passwordBusy} className="btn-primary px-4 py-2.5 text-sm">{passwordBusy ? "Changing…" : "Change"}</button>
        </form>
        {passwordMsg && <p className="mt-3 text-xs text-titanium-300">{passwordMsg}</p>}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-titanium-100">
          Audit log
        </h2>
        {!audit && (
          <div className="flex items-center gap-2 text-titanium-400">
            <Spinner /> Loading…
          </div>
        )}
        {audit && audit.length === 0 && (
          <p className="text-sm text-titanium-500">No audit entries yet.</p>
        )}
        {audit && audit.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-titanium-500">
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Actor</th>
                  <th className="p-3 font-medium">Action</th>
                  <th className="p-3 font-medium">Resource</th>
                  <th className="p-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="p-3 text-titanium-500">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-titanium-300">{a.actor}</td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-titanium-200">
                        {a.action}
                      </span>
                    </td>
                    <td className="p-3 text-titanium-400">{a.resource}</td>
                    <td className="p-3 text-titanium-600">{a.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
