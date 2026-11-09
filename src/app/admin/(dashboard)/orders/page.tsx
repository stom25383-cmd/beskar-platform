"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { PageHeader, Card, StatusPill } from "@/components/admin/ui";
import { Spinner } from "@/components/ui";
import type { Order } from "@/lib/types";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    apiGet<Order[]>("/api/admin/orders").then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Orders & payments"
        subtitle="Every purchase attempt, with server-verified status and settlement currency."
      />

      {!orders && (
        <div className="flex items-center gap-2 text-titanium-400">
          <Spinner /> Loading…
        </div>
      )}

      {orders && orders.length === 0 && (
        <Card className="text-center text-sm text-titanium-400">
          No orders yet. Orders appear here once customers begin purchasing paid
          applications.
        </Card>
      )}

      {orders && orders.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-titanium-500">
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Application</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Display</th>
                  <th className="p-4 font-medium">Provider</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="p-4 font-mono text-xs text-titanium-400">
                      {o.id}
                    </td>
                    <td className="p-4 text-titanium-200">{o.appName}</td>
                    <td className="p-4 text-titanium-200">
                      {(o.amount / 100).toLocaleString(undefined, {
                        style: "currency",
                        currency: o.transactionCurrency,
                      })}
                    </td>
                    <td className="p-4 text-titanium-500">{o.displayCurrency}</td>
                    <td className="p-4 capitalize text-titanium-400">
                      {o.provider}
                    </td>
                    <td className="p-4">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="p-4 text-titanium-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
