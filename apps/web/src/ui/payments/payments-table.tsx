"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import type { PaymentRow } from "@/lib/payments/types";
import { PaidAmountCell } from "@/ui/payments/paid-amount-cell";
import { PaymentsFilters } from "@/ui/payments/use-payment-filters";
import { PaymentsTableSkeleton } from "@/ui/payments/payments-table-skeleton";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import {
  Button,
  CopyText,
  EditColumnsButton,
  MenuItem,
  Popover,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CreditCard, Copy, Dots, Link4, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

type PaymentsListResponse = {
  payments: PaymentRow[];
  total: number;
};

const PAYMENTS_PAGE_SIZE = 20;

const paymentsColumns = {
  all: [
    "payment",
    "paid",
    "pricing",
    "status",
    "customer",
    "payer",
    "source",
    "createdAt",
    "expiresAt",
  ],
  defaultVisible: [
    "payment",
    "paid",
    "pricing",
    "status",
    "customer",
    "source",
    "createdAt",
    "expiresAt",
  ],
};

function getPaymentStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "pending":
      return "pending" as const;
    case "failed":
    case "expired":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

function formatSourceType(sourceType?: string) {
  switch (sourceType) {
    case "checkout_session":
      return "Checkout";
    case "payment_link":
      return "Payment link";
    case "invoice":
      return "Invoice";
    case "direct":
      return "API";
    default:
      return sourceType ?? "-";
  }
}

export function PaymentsTable({
  organizationId,
  refreshKey = 0,
  embedded = false,
}: {
  organizationId: string;
  refreshKey?: number;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { searchParams, queryParams } = useRouterStuff();

  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search") ?? "";
  const customerStatus = searchParams.get("customerStatus") ?? "";
  const status = searchParams.get("status") ?? "";
  const isFiltered = Boolean(search || customerStatus || status);

  const { pagination, setPagination } = usePagination(PAYMENTS_PAGE_SIZE);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payoes-payments-table-columns",
    paymentsColumns,
  );

  const fetchPayments = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
      sortOrder,
    });

    if (search) {
      params.set("search", search);
    }

    if (customerStatus) {
      params.set("customerStatus", customerStatus);
    }

    if (status) {
      params.set("status", status);
    }

    const response = await apiFetch(
      `/api/organizations/${organizationId}/payments?${params.toString()}`,
    );
    const data = (await response.json()) as PaymentsListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load payments");
    }

    return data;
  }, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    customerStatus,
    status,
  ]);

  const { data, error, isLoading } = useAsyncData(fetchPayments, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    customerStatus,
    status,
    refreshKey,
  ]);

  const columns = useMemo(
    () => [
      {
        id: "payment",
        header: "Payment",
        enableHiding: false,
        minSize: 160,
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <CopyText
            value={row.original.id}
            className="truncate font-mono text-xs"
          >
            {row.original.id}
          </CopyText>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        minSize: 140,
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <PaidAmountCell payment={row.original} />
        ),
      },
      {
        id: "pricing",
        header: "Pricing",
        minSize: 120,
        cell: ({ row }: { row: Row<PaymentRow> }) =>
          row.original.pricing_amount && row.original.pricing_currency
            ? formatAmountWithUnit(
                row.original.pricing_amount,
                row.original.pricing_currency,
              )
            : "-",
      },
      {
        id: "status",
        header: "Status",
        minSize: 110,
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <StatusBadge
            variant={getPaymentStatusVariant(row.original.status)}
            icon={null}
          >
            {row.original.status}
          </StatusBadge>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 140,
        cell: ({ row }: { row: Row<PaymentRow> }) =>
          row.original.customer_id ? (
            <span className="truncate font-mono text-xs">
              {row.original.customer_id}
            </span>
          ) : (
            "-"
          ),
      },
      {
        id: "payer",
        header: "Payer",
        minSize: 140,
        cell: ({ row }: { row: Row<PaymentRow> }) =>
          row.original.payer_address ? (
            <CopyText
              value={row.original.payer_address}
              className="truncate font-mono text-xs"
            >
              {`${row.original.payer_address.slice(0, 8)}...${row.original.payer_address.slice(-4)}`}
            </CopyText>
          ) : (
            "-"
          ),
      },
      {
        id: "source",
        header: "Source",
        minSize: 120,
        cell: ({ row }: { row: Row<PaymentRow> }) =>
          formatSourceType(row.original.source_type),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <TimestampTooltip
            timestamp={row.original.created_at}
            rows={["local", "utc"]}
            side="left"
            delayDuration={150}
          >
            <span>
              {formatDate(row.original.created_at, { month: "short" })}
            </span>
          </TimestampTooltip>
        ),
      },
      {
        id: "expiresAt",
        header: "Expires",
        accessorKey: "expires_at",
        cell: ({ row }: { row: Row<PaymentRow> }) =>
          row.original.expires_at ? (
            <TimestampTooltip
              timestamp={row.original.expires_at}
              rows={["local", "utc"]}
              side="left"
              delayDuration={150}
            >
              <span>
                {formatDate(row.original.expires_at, { month: "short" })}
              </span>
            </TimestampTooltip>
          ) : (
            "-"
          ),
      },
      {
        id: "menu",
        enableHiding: false,
        header: ({ table }: { table: TableType<PaymentRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <RowMenuButton row={row} />
        ),
      },
    ],
    [],
  );

  const getPaymentUrl = (paymentId: string) => `/dashboard/payments/${paymentId}`;

  const { table, ...tableProps } = useTable({
    data: data?.payments ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, event) => {
      const url = getPaymentUrl(row.original.id);

      if (event.metaKey || event.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => window.open(getPaymentUrl(row.original.id), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () => router.prefetch(getPaymentUrl(row.original.id)),
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["createdAt", "expiresAt"],
    sortBy: "createdAt",
    sortOrder,
    onSortChange: ({ sortOrder: nextSortOrder }) => {
      queryParams({
        set: {
          ...(nextSortOrder && { sortOrder: nextSortOrder }),
        },
        del: "page",
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `payment intent${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasPayments = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <PaymentsFilters />

      {isLoading ? (
        <PaymentsTableSkeleton />
      ) : hasPayments ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No payment intents yet"
          isFiltered={isFiltered}
          description="Payment intents created from checkout or API will appear here."
          icon={<CreditCard className="size-4 text-neutral-700" />}
          className={embedded ? "border-0" : undefined}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<PaymentRow> }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(row.original.id), {
                  success: "Copied payment ID",
                });
                setIsOpen(false);
              }}
            >
              Copy payment ID
            </MenuItem>
            {row.original.payer_address ? (
              <MenuItem
                as={Command.Item}
                icon={Copy}
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.payer_address!), {
                    success: "Copied payer address",
                  });
                  setIsOpen(false);
                }}
              >
                Copy payer address
              </MenuItem>
            ) : null}
            {row.original.checkout_url ? (
              <MenuItem
                as={Command.Item}
                icon={Link4}
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.checkout_url), {
                    success: "Copied checkout URL",
                  });
                  setIsOpen(false);
                }}
              >
                Copy checkout URL
              </MenuItem>
            ) : null}
            {row.original.customer_id ? (
              <MenuItem
                as={Command.Item}
                icon={Users}
                onSelect={() => {
                  router.push(`/dashboard/customers/${row.original.customer_id}`);
                  setIsOpen(false);
                }}
              >
                View customer
              </MenuItem>
            ) : null}
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-8 whitespace-nowrap px-2 disabled:border-transparent disabled:bg-transparent"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
