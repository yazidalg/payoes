"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerDetail } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerPaymentsTable } from "@/ui/customers/customer-payments-table";
import { CustomerStats } from "@/ui/customers/customer-stats";
import { Button } from "@dub/ui";
import { ChevronRight, Users } from "@dub/ui/icons";

export function CustomerDetailPanel({
  organizationId,
  customerId,
}: {
  organizationId: string;
  customerId: string;
}) {
  const router = useRouter();

  const fetchDetail = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/customers/${customerId}`,
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

  if (error || (!isLoading && !detail)) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/customers"
          className="bg-bg-subtle hover:bg-bg-emphasis inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        >
          <Users className="size-4" />
        </Link>
        <AlertBlock type="error">{error ?? "Customer not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-1.5">
        <Link
          href="/dashboard/customers"
          aria-label="Back to customers"
          title="Back to customers"
          className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 active:scale-95"
        >
          <Users className="size-4" />
        </Link>
        <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
        <div className="min-w-0">
          {detail ? (
            <>
              <h2 className="text-content-emphasis truncate text-base font-semibold">
                {formatCustomerLabel(detail.customer)}
              </h2>
              <p className="truncate font-mono text-xs text-neutral-500">
                {detail.customer.id}
              </p>
            </>
          ) : (
            <div className="space-y-1">
              <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-28 animate-pulse rounded bg-neutral-200" />
            </div>
          )}
        </div>
        {detail ? (
          <Button
            type="button"
            variant="secondary"
            text="All customers"
            className="ml-auto h-8 w-fit"
            onClick={() => router.push("/dashboard/customers")}
          />
        ) : null}
      </div>

      <CustomerStats payments={detail?.payments} isLoading={isLoading} />

      <div className="@3xl/page:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] grid grid-cols-1 gap-6">
        <div className="@3xl/page:order-1">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">
              Payment history
            </h2>
            <div className="border-border-subtle overflow-hidden rounded-xl border bg-white">
              <CustomerPaymentsTable
                payments={detail?.payments}
                isLoading={isLoading}
              />
            </div>
          </section>
        </div>

        <div className="@3xl/page:order-2">
          <CustomerDetailsColumn
            customer={detail?.customer}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
