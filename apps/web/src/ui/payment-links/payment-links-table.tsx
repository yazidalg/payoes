"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import type { PaymentLinkRow } from "@/lib/payments/types";
import { PaymentLinksFilters } from "@/ui/payment-links/use-payment-link-filters";
import { PaymentLinksTableSkeleton } from "@/ui/payment-links/payment-links-table-skeleton";
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
import { Copy, Dots, Hyperlink } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

type PaymentLinksListResponse = {
  payment_links: PaymentLinkRow[];
  total: number;
};

const PAGE_SIZE = 20;

const paymentLinkColumns = {
  all: ["link", "products", "amount", "status", "createdAt"],
  defaultVisible: ["link", "products", "amount", "status", "createdAt"],
};

function formatProductsLabel(link: PaymentLinkRow) {
  if (link.items?.length) {
    const count = link.items.length;
    return `${count} product${count === 1 ? "" : "s"}`;
  }

  if (link.item_count) {
    return `${link.item_count} product${link.item_count === 1 ? "" : "s"}`;
  }

  return link.product_name ?? "-";
}

function formatLinkAmount(link: PaymentLinkRow) {
  if (link.currency_code) {
    return formatAmountWithUnit(link.amount, link.currency_code);
  }

  return formatAmountWithUnit(link.amount, link.settlement_asset.asset_code);
}

export function PaymentLinksTable({
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
    "payoes-payment-links-table-columns",
    paymentLinkColumns,
  );

  const fetchLinks = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
      sortOrder,
    });

    if (search) params.set("search", search);
    if (status) params.set("status", status);

    const response = await fetch(
      `/api/organizations/${organizationId}/payment-links?${params.toString()}`,
    );
    const data = (await response.json()) as PaymentLinksListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load payment links");
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

  const { data, error, isLoading } = useAsyncData(fetchLinks, [
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
        id: "link",
        header: "Link",
        enableHiding: false,
        minSize: 160,
        cell: ({ row }: { row: Row<PaymentLinkRow> }) => (
          <CopyText
            value={row.original.id}
            className="truncate font-mono text-xs"
          >
            {row.original.id}
          </CopyText>
        ),
      },
      {
        id: "products",
        header: "Products",
        minSize: 160,
        cell: ({ row }: { row: Row<PaymentLinkRow> }) =>
          formatProductsLabel(row.original),
      },
      {
        id: "amount",
        header: "Amount",
        minSize: 120,
        cell: ({ row }: { row: Row<PaymentLinkRow> }) =>
          formatLinkAmount(row.original),
      },
      {
        id: "status",
        header: "Status",
        minSize: 110,
        cell: ({ row }: { row: Row<PaymentLinkRow> }) => (
          <StatusBadge
            variant={row.original.active ? "success" : "neutral"}
            icon={null}
          >
            {row.original.active ? "Active" : "Inactive"}
          </StatusBadge>
        ),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<PaymentLinkRow> }) => (
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
        header: ({ table }: { table: TableType<PaymentLinkRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<PaymentLinkRow> }) => (
          <RowMenuButton row={row} />
        ),
      },
    ],
    [],
  );

  const getLinkUrl = (linkId: string) => `/dashboard/payments/links/${linkId}`;

  const { table, ...tableProps } = useTable({
    data: data?.payment_links ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, event) => {
      const url = getLinkUrl(row.original.id);
      if (event.metaKey || event.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => window.open(getLinkUrl(row.original.id), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () => router.prefetch(getLinkUrl(row.original.id)),
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["createdAt"],
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
    resourceName: (plural) => `payment link${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasLinks = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <PaymentLinksFilters />

      {isLoading ? (
        <PaymentLinksTableSkeleton />
      ) : hasLinks ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No payment links yet"
          isFiltered={isFiltered}
          description="Payment links you create will appear here."
          icon={<Hyperlink className="size-4 text-neutral-700" />}
          className={embedded ? "border-0" : undefined}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<PaymentLinkRow> }) {
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
                  success: "Copied link ID",
                });
                setIsOpen(false);
              }}
            >
              Copy link ID
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(row.original.url), {
                  success: "Checkout link copied",
                });
                setIsOpen(false);
              }}
            >
              Copy checkout link
            </MenuItem>
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
