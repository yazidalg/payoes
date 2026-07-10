"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  formatAssetAmount,
  type CheckoutSessionRow,
} from "@/lib/payments/types";
import { CheckoutSessionsFilters } from "@/ui/checkout-sessions/use-checkout-session-filters";
import { CheckoutSessionsTableSkeleton } from "@/ui/checkout-sessions/checkout-sessions-table-skeleton";
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
import { Copy, CreditCard, Dots, Link4, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

type CheckoutSessionsListResponse = {
  checkout_sessions: CheckoutSessionRow[];
  total: number;
};

const PAGE_SIZE = 20;

const checkoutSessionColumns = {
  all: [
    "session",
    "amount",
    "paymentIntent",
    "status",
    "customer",
    "createdAt",
    "expiresAt",
  ],
  defaultVisible: [
    "session",
    "amount",
    "paymentIntent",
    "status",
    "createdAt",
    "expiresAt",
  ],
};

function getCheckoutSessionStatusVariant(status: string) {
  switch (status) {
    case "complete":
      return "success" as const;
    case "open":
      return "pending" as const;
    case "expired":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

export function CheckoutSessionsTable({
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
    "payoes-checkout-sessions-table-columns",
    checkoutSessionColumns,
  );

  const fetchSessions = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
      sortOrder,
    });

    if (search) params.set("search", search);
    if (status) params.set("status", status);

    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions?${params.toString()}`,
    );
    const data = (await response.json()) as CheckoutSessionsListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load checkout sessions");
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

  const { data, error, isLoading } = useAsyncData(fetchSessions, [
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
        id: "session",
        header: "Session",
        enableHiding: false,
        minSize: 160,
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) => (
          <CopyText
            value={row.original.id}
            className="truncate font-mono text-xs"
          >
            {row.original.id}
          </CopyText>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        minSize: 120,
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) =>
          row.original.amount
            ? formatAssetAmount(
                row.original.amount,
                row.original.settlement_asset,
              )
            : "-",
      },
      {
        id: "paymentIntent",
        header: "Payment intent",
        minSize: 160,
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) =>
          row.original.payment_intent_id ? (
            <CopyText
              value={row.original.payment_intent_id}
              className="truncate font-mono text-xs"
            >
              {row.original.payment_intent_id}
            </CopyText>
          ) : (
            "-"
          ),
      },
      {
        id: "status",
        header: "Status",
        minSize: 110,
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) => (
          <StatusBadge
            variant={getCheckoutSessionStatusVariant(row.original.status)}
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
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) =>
          row.original.customer_id ? (
            <span className="truncate font-mono text-xs">
              {row.original.customer_id}
            </span>
          ) : (
            "-"
          ),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) => (
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
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) =>
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
        header: ({ table }: { table: TableType<CheckoutSessionRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<CheckoutSessionRow> }) => (
          <RowMenuButton row={row} />
        ),
      },
    ],
    [],
  );

  const getSessionUrl = (sessionId: string) =>
    `/dashboard/payments/checkout-sessions/${sessionId}`;

  const { table, ...tableProps } = useTable({
    data: data?.checkout_sessions ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, event) => {
      const url = getSessionUrl(row.original.id);
      if (event.metaKey || event.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => window.open(getSessionUrl(row.original.id), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () => router.prefetch(getSessionUrl(row.original.id)),
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
        set: { ...(nextSortOrder && { sortOrder: nextSortOrder }) },
        del: "page",
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `checkout session${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasSessions = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <CheckoutSessionsFilters />

      {isLoading ? (
        <CheckoutSessionsTableSkeleton />
      ) : hasSessions ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No checkout sessions yet"
          isFiltered={isFiltered}
          description="Create a checkout session to start accepting payments."
          icon={<CreditCard className="size-4 text-neutral-700" />}
          className={embedded ? "border-0" : undefined}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<CheckoutSessionRow> }) {
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
                  success: "Copied session ID",
                });
                setIsOpen(false);
              }}
            >
              Copy session ID
            </MenuItem>
            {row.original.payment_intent_id ? (
              <MenuItem
                as={Command.Item}
                icon={Copy}
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.payment_intent_id!), {
                    success: "Copied payment intent ID",
                  });
                  setIsOpen(false);
                }}
              >
                Copy payment intent ID
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
