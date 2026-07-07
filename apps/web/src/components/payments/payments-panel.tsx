"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks/use-async-data";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import { cn } from "@/lib/utils";

type PaymentRow = {
  id: string;
  amount: string;
  asset: string;
  status: string;
  description: string | null;
  checkout_url: string;
  customer_id: string | null;
  payer_address: string | null;
  created_at: string;
};

type CustomerOption = {
  id: string;
  name: string | null;
  email: string | null;
  primary_stellar_address: string | null;
};

function customerLabel(customer: CustomerOption) {
  if (customer.name) {
    return customer.name;
  }

  if (customer.email) {
    return customer.email;
  }

  if (customer.primary_stellar_address) {
    return `${customer.primary_stellar_address.slice(0, 8)}...`;
  }

  return customer.id;
}

export function PaymentsPanel({ organizationId }: { organizationId: string }) {
  const fetchPayments = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/payments`);
    const data = (await response.json()) as { payments?: PaymentRow[] };
    return data.payments ?? [];
  }, [organizationId]);

  const fetchCustomers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as { customers?: CustomerOption[] };
    return data.customers ?? [];
  }, [organizationId]);

  const { data: payments, reload: reloadPayments } = useAsyncData(fetchPayments, [
    organizationId,
  ]);
  const { data: customers } = useAsyncData(fetchCustomers, [organizationId]);
  const [amount, setAmount] = useState("10");
  const [asset, setAsset] = useState<(typeof ACCEPTED_ASSET_OPTIONS)[number]>("USDC");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/organizations/${organizationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        asset,
        description: description || null,
        customer_id: customerId || null,
      }),
    });

    const data = (await response.json()) as { error?: string; checkout_url?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create payment");
      setIsLoading(false);
      return;
    }

    toast.success("Payment created");
    setDescription("");
    reloadPayments();
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create payments and share checkout links with customers.
        </p>
      </div>

      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      <div className="rounded-xl border border-border/80 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Asset</Label>
            <div className="flex gap-2">
              {ACCEPTED_ASSET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAsset(option)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    asset === option
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Invoice #1024"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="customer">Customer (optional)</Label>
            <select
              id="customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">No customer</option>
              {(customers ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customerLabel(customer)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          type="button"
          className="mt-4"
          onClick={() => void handleCreate()}
          isLoading={isLoading}
        >
          Create payment
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Checkout</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No payments yet.
                </td>
              </tr>
            ) : (
              (payments ?? []).map((payment) => (
                <tr key={payment.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">{payment.id}</td>
                  <td className="px-4 py-3">
                    {payment.amount} {payment.asset}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {payment.customer_id ?? payment.payer_address?.slice(0, 10) ?? "N/A"}
                  </td>
                  <td className="px-4 py-3 capitalize">{payment.status}</td>
                  <td className="px-4 py-3">
                    <a
                      href={payment.checkout_url}
                      className="text-primary underline-offset-4 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open checkout
                    </a>
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
