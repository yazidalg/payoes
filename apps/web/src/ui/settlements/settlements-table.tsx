"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/hooks/use-async-data";
import type { Organization } from "@/lib/db/schema";
import type { SettlementConversionRow } from "@/lib/payments/types";
import { AssetAmountCell } from "@/ui/assets/asset-amount-cell";
import { getStellarExpertTxUrlIfValid } from "@/lib/stellar/explorer";
import { SettlementsFilters } from "@/ui/settlements/use-settlement-filters";
import { SettlementsTableSkeleton } from "@/ui/settlements/settlements-table-skeleton";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import {
  Button,
  CopyText,
  EditColumnsButton,
  MenuItem,
  Popover,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDollarOut, Copy, Dots } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

type SettlementsListResponse = {
  settlements: SettlementConversionRow[];
  total: number;
};

const SETTLEMENTS_PAGE_SIZE = 20;

const settlementsColumns = {
  all: [
    "payment",
    "paid",
    "received",
    "invoice",
    "type",
    "tx",
    "confirmedAt",
  ],
  defaultVisible: [
    "payment",
    "paid",
    "received",
    "invoice",
    "type",
    "tx",
    "confirmedAt",
  ],
};

export function SettlementsTable({
  organizationId,
  environment,
}: {
  organizationId: string;
  environment: Organization["environment"];
}) {
  const router = useRouter();
  const { searchParams, queryParams } = useRouterStuff();

  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search") ?? "";
  const conversionType = searchParams.get("conversionType") ?? "";
  const isFiltered = Boolean(search || conversionType);

  const { pagination, setPagination } = usePagination(SETTLEMENTS_PAGE_SIZE);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payoes-settlements-table-columns",
    settlementsColumns,
  );

  const fetchSettlements = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
      sortOrder,
    });

    if (search) {
      params.set("search", search);
    }

    if (conversionType) {
      params.set("conversionType", conversionType);
    }

    const response = await fetch(
      `/api/organizations/${organizationId}/settlements?${params.toString()}`,
    );
    const data = (await response.json()) as SettlementsListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load settlements");
    }

    return data;
  }, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    conversionType,
  ]);

  const { data, error, isLoading } = useAsyncData(fetchSettlements, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    conversionType,
  ]);

  const columns = useMemo(
    () => [
      {
        id: "payment",
        header: "Payment",
        enableHiding: false,
        minSize: 160,
        cell: ({ row }: { row: Row<SettlementConversionRow> }) => (
          <CopyText
            value={row.original.payment_id}
            className="truncate font-mono text-xs"
          >
            {row.original.payment_id}
          </CopyText>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        minSize: 120,
        cell: ({ row }: { row: Row<SettlementConversionRow> }) => (
          <AssetAmountCell
            amount={row.original.quoted_paid_amount}
            asset={row.original.paid_asset}
          />
        ),
      },
      {
        id: "received",
        header: "Merchant receives",
        minSize: 120,
        cell: ({ row }: { row: Row<SettlementConversionRow> }) =>
          row.original.merchant_settlement_amount ? (
            <AssetAmountCell
              amount={row.original.merchant_settlement_amount}
              asset={row.original.settlement_asset}
            />
          ) : (
            "-"
          ),
      },
      {
        id: "invoice",
        header: "Invoice",
        minSize: 140,
        cell: ({ row }: { row: Row<SettlementConversionRow> }) =>
          row.original.invoice_id ? (
            <Link
              href={`/dashboard/payments/invoices/${row.original.invoice_id}`}
              className="truncate font-mono text-xs decoration-dotted underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.invoice_id}
            </Link>
          ) : (
            "-"
          ),
      },
      {
        id: "type",
        header: "Type",
        minSize: 120,
        cell: ({ row }: { row: Row<SettlementConversionRow> }) =>
          row.original.converted_on_chain ? "Path payment" : "Direct receive",
      },
      {
        id: "tx",
        header: "Tx",
        minSize: 120,
        cell: ({ row }: { row: Row<SettlementConversionRow> }) => {
          const explorerUrl = getStellarExpertTxUrlIfValid(
            row.original.tx_hash,
            environment,
          );

          return row.original.tx_hash && explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-xs decoration-dotted underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {`${row.original.tx_hash.slice(0, 8)}...`}
            </a>
          ) : (
            "-"
          );
        },
      },
      {
        id: "confirmedAt",
        header: "Confirmed",
        accessorKey: "confirmed_at",
        cell: ({ row }: { row: Row<SettlementConversionRow> }) =>
          row.original.confirmed_at ? (
            <TimestampTooltip
              timestamp={row.original.confirmed_at}
              rows={["local", "utc"]}
              side="left"
              delayDuration={150}
            >
              <span>
                {formatDate(row.original.confirmed_at, { month: "short" })}
              </span>
            </TimestampTooltip>
          ) : (
            "-"
          ),
      },
      {
        id: "menu",
        enableHiding: false,
        header: ({ table }: { table: TableType<SettlementConversionRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<SettlementConversionRow> }) => (
          <RowMenuButton row={row} environment={environment} />
        ),
      },
    ],
    [environment],
  );

  const getPaymentUrl = (paymentId: string) => `/dashboard/payments/${paymentId}`;

  const { table, ...tableProps } = useTable({
    data: data?.settlements ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, event) => {
      const url = getPaymentUrl(row.original.payment_id);

      if (event.metaKey || event.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) =>
      window.open(getPaymentUrl(row.original.payment_id), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () =>
        router.prefetch(getPaymentUrl(row.original.payment_id)),
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["confirmedAt"],
    sortBy: "confirmedAt",
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
    resourceName: (plural) => `settlement${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasSettlements = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <SettlementsFilters />

      {isLoading ? (
        <SettlementsTableSkeleton />
      ) : hasSettlements ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No settlement conversions yet"
          isFiltered={isFiltered}
          description="Cross-asset invoice payments converted into your settlement asset will appear here."
          icon={<CircleDollarOut className="size-4 text-neutral-700" />}
        />
      )}
    </div>
  );
}

function RowMenuButton({
  row,
  environment,
}: {
  row: Row<SettlementConversionRow>;
  environment: Organization["environment"];
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
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(row.original.payment_id), {
                  success: "Copied payment ID",
                });
                setIsOpen(false);
              }}
            >
              Copy payment ID
            </MenuItem>
            {row.original.tx_hash ? (
              <MenuItem
                as={Command.Item}
                icon={Copy}
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.tx_hash!), {
                    success: "Copied transaction hash",
                  });
                  setIsOpen(false);
                }}
              >
                Copy tx hash
              </MenuItem>
            ) : null}
            {getStellarExpertTxUrlIfValid(row.original.tx_hash, environment) ? (
              <MenuItem
                as={Command.Item}
                icon={CircleDollarOut}
                onSelect={() => {
                  window.open(
                    getStellarExpertTxUrlIfValid(
                      row.original.tx_hash,
                      environment,
                    )!,
                    "_blank",
                  );
                  setIsOpen(false);
                }}
              >
                View on explorer
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
