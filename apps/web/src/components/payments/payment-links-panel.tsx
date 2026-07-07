"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PaymentRow = {
  id: string;
  amount: string;
  asset: string;
  status: string;
  checkout_url: string;
  created_at: string;
};

export function PaymentLinksPanel({ organizationId }: { organizationId: string }) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/payments`);
    const data = (await response.json()) as { payments?: PaymentRow[] };
    setPayments((data.payments ?? []).filter((payment) => payment.status === "pending"));
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Checkout link copied");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment Links</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share hosted checkout links for pending payments.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No pending payment links.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">{payment.id}</td>
                  <td className="px-4 py-3">
                    {payment.amount} {payment.asset}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyLink(payment.checkout_url)}
                    >
                      Copy link
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
