"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useEditCustomerSheet } from "@/components/customers/use-edit-customer-sheet";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerDetail, CustomerRow } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";
import { CustomerDetailSkeleton } from "@/ui/customers/customer-detail-skeleton";
import { CustomerDetailsColumn } from "@/ui/customers/customer-details-column";
import { CustomerPaymentsTable } from "@/ui/customers/customer-payments-table";
import { CustomerStats } from "@/ui/customers/customer-stats";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import {
  Button,
  MenuItem,
  Popover,
  useCopyToClipboard,
} from "@dub/ui";
import { ChevronRight, Copy, Dots, Users } from "@dub/ui/icons";
import { Command } from "cmdk";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

export function CustomerDetailPanel({
  organizationId,
  customerId,
}: {
  organizationId: string;
  customerId: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { openEditCustomer, EditCustomerSheet } = useEditCustomerSheet({
    organizationId,
    onUpdated: () => setRefreshKey((current) => current + 1),
  });

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
    refreshKey,
  ]);

  const headerOverride = useMemo(() => {
    if (!detail?.customer) {
      return null;
    }

    const customer = detail.customer;

    return {
      title: (
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/dashboard/customers"
            aria-label="Back to customers"
            title="Back to customers"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <Users className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-base font-semibold">
            {formatCustomerLabel(customer)}
          </span>
        </div>
      ),
      controls: (
        <CustomerDetailMenu
          customer={customer}
          onEdit={() => openEditCustomer(customer)}
        />
      ),
    };
  }, [detail?.customer, openEditCustomer]);

  useSetDashboardPageHeader(headerOverride);

  if (isLoading) {
    return <CustomerDetailSkeleton />;
  }

  if (error || !detail) {
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
    <>
      <EditCustomerSheet />

      <div className="space-y-6 pb-10">
        <CustomerStats payments={detail.payments} />

        <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
          <div className="@3xl/page:order-2">
            <CustomerDetailsColumn customer={detail.customer} />
          </div>

          <div className="@3xl/page:order-1">
            <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
              <div className="border-border-subtle border-b px-4 py-3">
                <h2 className="text-content-emphasis text-sm font-semibold">
                  Payments
                </h2>
              </div>
              <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white">
                <CustomerPaymentsTable payments={detail.payments} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CustomerDetailMenu({
  customer,
  onEdit,
}: {
  customer: CustomerRow;
  onEdit: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[160px]">
            <MenuItem
              as={Command.Item}
              icon={Pencil}
              onSelect={() => {
                onEdit();
                setIsOpen(false);
              }}
            >
              Edit customer
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(customer.id), {
                  success: "Copied customer ID",
                });
                setIsOpen(false);
              }}
            >
              Copy ID
            </MenuItem>
            {customer.email ? (
              <MenuItem
                as={Command.Item}
                icon={Copy}
                onSelect={() => {
                  toast.promise(copyToClipboard(customer.email!), {
                    success: "Copied email",
                  });
                  setIsOpen(false);
                }}
              >
                Copy email
              </MenuItem>
            ) : null}
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-9 whitespace-nowrap px-2"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
