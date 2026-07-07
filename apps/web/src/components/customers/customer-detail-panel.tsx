"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerDetail } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";

export function CustomerDetailPanel({
  organizationId,
  customerId,
}: {
  organizationId: string;
  customerId: string;
}) {
  const fetchDetail = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/customers/${customerId}`
    );
    const data = (await response.json()) as CustomerDetail & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Customer not found");
    }

    return data;
  }, [organizationId, customerId]);

  const { data: detail, error, isLoading } = useAsyncData(fetchDetail, [
    organizationId,
    customerId,
  ]);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading customer...</div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/customers" />}
        >
          <ArrowLeftIcon />
          Back to customers
        </Button>
        <AlertBlock type="error">{error ?? "Customer not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/customers" />}
          >
            <ArrowLeftIcon />
            Back to customers
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatCustomerLabel(detail.customer)}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {detail.customer.id}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Customer details and contact information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1">{detail.customer.email ?? "N/A"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Wallet</dt>
              <dd className="mt-1 font-mono text-xs break-all">
                {detail.customer.primary_stellar_address ?? "N/A"}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="mt-1">{detail.customer.notes ?? "N/A"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">
                {new Date(detail.customer.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>
            Payments linked to this customer, including auto-linked checkout
            payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payer</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No payments linked to this customer yet.
                    </td>
                  </tr>
                ) : (
                  detail.payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-mono text-xs">{payment.id}</td>
                      <td className="px-4 py-3">
                        {payment.amount} {payment.asset}
                      </td>
                      <td className="px-4 py-3 capitalize">{payment.status}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {payment.payer_address
                          ? `${payment.payer_address.slice(0, 10)}...`
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
