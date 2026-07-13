"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import type { InvoiceRow } from "@/lib/payments/types";
import { InvoicesFilters } from "@/ui/invoices/use-invoice-filters";
import { InvoicesTableSkeleton } from "@/ui/invoices/invoices-table-skeleton";
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
import { Copy, Dots, FileContent, Link4, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";
import {
  getInvoiceRowStatusLabel,
  getInvoiceRowStatusVariant,
} from "@/ui/payments/payment-formatters";

type InvoicesListResponse = {
  invoices: InvoiceRow[];
  total: number;
};

const PAGE_SIZE = 20;

const invoiceColumns = {
  all: ["invoice", "amount", "customer", "status", "dueAt", "createdAt"],
  defaultVisible: ["invoice", "amount", "customer", "status", "dueAt", "createdAt"],
};

export function InvoicesTable({
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
  const status = searchParams.get("status") ?? "";
  const isFiltered = Boolean(search || status);

  const { pagination, setPagination } = usePagination(PAGE_SIZE);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payoes-invoices-table-columns",
    invoiceColumns,
  );

  const fetchInvoices = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
      sortOrder,
    });

    if (search) params.set("search", search);
    if (status) params.set("status", status);

    const response = await apiFetch(
      `/api/organizations/${organizationId}/invoices?${params.toString()}`,
    );
    const data = (await response.json()) as InvoicesListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load invoices");
    }

    return data;
  }, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    status,
  ]);

  const { data, error, isLoading } = useAsyncData(fetchInvoices, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    status,
    refreshKey,
  ]);

  const columns = useMemo(
    () => [
      {
        id: "invoice",
        header: "Invoice",
        enableHiding: false,
        minSize: 160,
        cell: ({ row }: { row: Row<InvoiceRow> }) => (
          <CopyText
            value={row.original.id}
            className="truncate font-mono text-xs"
          >
            {row.original.invoice_number || row.original.id}
          </CopyText>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        minSize: 120,
        cell: ({ row }: { row: Row<InvoiceRow> }) =>
          formatAmountWithUnit(row.original.amount, row.original.currency_code),
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 160,
        cell: ({ row }: { row: Row<InvoiceRow> }) =>
          row.original.customer_name ??
          row.original.customer_id ??
          "-",
      },
      {
        id: "status",
        header: "Status",
        minSize: 110,
        cell: ({ row }: { row: Row<InvoiceRow> }) => (
          <StatusBadge
            variant={getInvoiceRowStatusVariant(row.original)}
            icon={null}
          >
            {getInvoiceRowStatusLabel(row.original)}
          </StatusBadge>
        ),
      },
      {
        id: "dueAt",
        header: "Due",
        accessorKey: "due_at",
        cell: ({ row }: { row: Row<InvoiceRow> }) =>
          row.original.due_at ? (
            <TimestampTooltip
              timestamp={row.original.due_at}
              rows={["local", "utc"]}
              side="left"
              delayDuration={150}
            >
              <span>{formatDate(row.original.due_at, { month: "short" })}</span>
            </TimestampTooltip>
          ) : (
            "-"
          ),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<InvoiceRow> }) => (
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
        id: "menu",
        enableHiding: false,
        header: ({ table }: { table: TableType<InvoiceRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<InvoiceRow> }) => (
          <RowMenuButton row={row} />
        ),
      },
    ],
    [],
  );

  const getInvoiceUrl = (invoiceId: string) =>
    `/dashboard/payments/invoices/${invoiceId}`;

  const { table, ...tableProps } = useTable({
    data: data?.invoices ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, event) => {
      const url = getInvoiceUrl(row.original.id);
      if (event.metaKey || event.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => window.open(getInvoiceUrl(row.original.id), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () => router.prefetch(getInvoiceUrl(row.original.id)),
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["createdAt", "dueAt"],
    sortBy: "createdAt",
    sortOrder,
    onSortChange: ({ sortOrder: nextSortOrder }) => {
      queryParams({
        set: { ...(nextSortOrder && { sortOrder: nextSortOrder }) },
        del: "page",
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `invoice${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasInvoices = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <InvoicesFilters />

      {isLoading ? (
        <InvoicesTableSkeleton />
      ) : hasInvoices ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No invoices yet"
          isFiltered={isFiltered}
          description="Invoices you create will appear here."
          icon={<FileContent className="size-4 text-neutral-700" />}
          className={embedded ? "border-0" : undefined}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<InvoiceRow> }) {
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
                  success: "Copied invoice ID",
                });
                setIsOpen(false);
              }}
            >
              Copy invoice ID
            </MenuItem>
            {row.original.checkout_url ? (
              <MenuItem
                as={Command.Item}
                icon={Link4}
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.checkout_url!), {
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
