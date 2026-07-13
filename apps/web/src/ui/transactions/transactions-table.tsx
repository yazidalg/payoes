"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import type { Organization } from "@/lib/db/schema";
import type { PaymentRow } from "@/lib/payments/types";
import { AssetAmountCell } from "@/ui/assets/asset-amount-cell";
import { PaidAmountCell } from "@/ui/payments/paid-amount-cell";
import { getStellarExpertTxUrlIfValid } from "@/lib/stellar/explorer";
import { TransactionsFilters } from "@/ui/transactions/use-transaction-filters";
import { TransactionsTableSkeleton } from "@/ui/transactions/transactions-table-skeleton";
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
import { CircleCheck, Copy, Dots, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

type TransactionsListResponse = {
  transactions: PaymentRow[];
  total: number;
};

const TRANSACTIONS_PAGE_SIZE = 20;

const transactionsColumns = {
  all: [
    "payment",
    "paid",
    "settlement",
    "pricing",
    "payer",
    "txHash",
    "confirmedAt",
  ],
  defaultVisible: [
    "payment",
    "paid",
    "settlement",
    "pricing",
    "payer",
    "txHash",
    "confirmedAt",
  ],
};

export function TransactionsTable({
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
  const customerStatus = searchParams.get("customerStatus") ?? "";
  const isFiltered = Boolean(search || customerStatus);

  const { pagination, setPagination } = usePagination(TRANSACTIONS_PAGE_SIZE);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payoes-transactions-table-columns",
    transactionsColumns,
  );

  const fetchTransactions = useCallback(async () => {
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

    const response = await apiFetch(
      `/api/organizations/${organizationId}/transactions?${params.toString()}`,
    );
    const data = (await response.json()) as TransactionsListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load transactions");
    }

    return data;
  }, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    customerStatus,
  ]);

  const { data, error, isLoading } = useAsyncData(fetchTransactions, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortOrder,
    customerStatus,
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
        minSize: 120,
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <PaidAmountCell payment={row.original} />
        ),
      },
      {
        id: "settlement",
        header: "Merchant receives",
        minSize: 120,
        cell: ({ row }: { row: Row<PaymentRow> }) =>
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
        id: "txHash",
        header: "Tx hash",
        minSize: 120,
        cell: ({ row }: { row: Row<PaymentRow> }) => {
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
        cell: ({ row }: { row: Row<PaymentRow> }) =>
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
        header: ({ table }: { table: TableType<PaymentRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<PaymentRow> }) => (
          <RowMenuButton row={row} environment={environment} />
        ),
      },
    ],
    [environment],
  );

  const getPaymentUrl = (paymentId: string) => `/dashboard/payments/${paymentId}`;

  const { table, ...tableProps } = useTable({
    data: data?.transactions ?? [],
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
    resourceName: (plural) => `transaction${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasTransactions = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <TransactionsFilters />

      {isLoading ? (
        <TransactionsTableSkeleton />
      ) : hasTransactions ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No confirmed transactions yet"
          isFiltered={isFiltered}
          description="Completed blockchain payments for your business will appear here."
          icon={<CircleCheck className="size-4 text-neutral-700" />}
        />
      )}
    </div>
  );
}

function RowMenuButton({
  row,
  environment,
}: {
  row: Row<PaymentRow>;
  environment: Organization["environment"];
}) {
  const router = useRouter();
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
                icon={CircleCheck}
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
