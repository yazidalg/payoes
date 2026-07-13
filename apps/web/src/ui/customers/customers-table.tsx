"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditCustomerSheet } from "@/components/customers/use-edit-customer-sheet";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerRow } from "@/lib/customers/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { CustomersFilters } from "@/ui/customers/use-customer-filters";
import { CustomersTableSkeleton } from "@/ui/customers/customers-table-skeleton";
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
import { Copy, Dots, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";
import { Command } from "cmdk";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

type CustomersListResponse = {
  customers: CustomerRow[];
  total: number;
};

const CUSTOMERS_PAGE_SIZE = 20;

const customersColumns = {
  all: ["customer", "email", "wallet", "createdAt", "id"],
  defaultVisible: ["customer", "email", "wallet", "createdAt"],
};

export function CustomersTable({
  organizationId,
  refreshKey = 0,
}: {
  organizationId: string;
  refreshKey?: number;
}) {
  const router = useRouter();
  const { searchParams, queryParams } = useRouterStuff();
  const [editRefreshKey, setEditRefreshKey] = useState(0);
  const { openEditCustomer, EditCustomerSheet } = useEditCustomerSheet({
    organizationId,
    onUpdated: () => setEditRefreshKey((current) => current + 1),
  });

  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search") ?? "";
  const walletStatus = searchParams.get("walletStatus") ?? "";
  const emailStatus = searchParams.get("emailStatus") ?? "";
  const paymentStatus = searchParams.get("paymentStatus") ?? "";
  const isFiltered = Boolean(
    search ||
      walletStatus ||
      emailStatus ||
      paymentStatus,
  );

  const { pagination, setPagination } = usePagination(CUSTOMERS_PAGE_SIZE);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payoes-customers-table-columns",
    customersColumns,
  );

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
      sortBy,
      sortOrder,
    });

    if (search) {
      params.set("search", search);
    }

    if (walletStatus) {
      params.set("walletStatus", walletStatus);
    }

    if (emailStatus) {
      params.set("emailStatus", emailStatus);
    }

    if (paymentStatus) {
      params.set("paymentStatus", paymentStatus);
    }

    const response = await apiFetch(
      `/api/organizations/${organizationId}/customers?${params.toString()}`,
    );
    const data = (await response.json()) as CustomersListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load customers");
    }

    return data;
  }, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortBy,
    sortOrder,
    walletStatus,
    emailStatus,
    paymentStatus,
  ]);

  const {
    data,
    error,
    isLoading,
  } = useAsyncData(fetchCustomers, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sortBy,
    sortOrder,
    walletStatus,
    emailStatus,
    paymentStatus,
    refreshKey,
    editRefreshKey,
  ]);

  const columns = useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        enableHiding: false,
        minSize: 220,
        cell: ({ row }: { row: Row<CustomerRow> }) => (
          <CustomerRowItem customer={row.original} />
        ),
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        minSize: 180,
        cell: ({ row }: { row: Row<CustomerRow> }) => (
          <span className="truncate text-neutral-600">
            {row.original.email ?? "-"}
          </span>
        ),
      },
      {
        id: "wallet",
        header: "Wallet",
        accessorKey: "primary_stellar_address",
        minSize: 160,
        cell: ({ row }: { row: Row<CustomerRow> }) =>
          row.original.primary_stellar_address ? (
            <CopyText
              value={row.original.primary_stellar_address}
              className="truncate font-mono text-xs"
            >
              {`${row.original.primary_stellar_address.slice(0, 8)}...${row.original.primary_stellar_address.slice(-4)}`}
            </CopyText>
          ) : (
            "-"
          ),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<CustomerRow> }) => (
          <TimestampTooltip
            timestamp={row.original.created_at}
            rows={["local"]}
            side="left"
            delayDuration={150}
          >
            <span>{formatDate(row.original.created_at, { month: "short" })}</span>
          </TimestampTooltip>
        ),
      },
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        cell: ({ row }: { row: Row<CustomerRow> }) => (
          <CopyText value={row.original.id} className="truncate font-mono text-xs">
            {row.original.id}
          </CopyText>
        ),
      },
      {
        id: "menu",
        enableHiding: false,
        header: ({ table }: { table: TableType<CustomerRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: ({ row }: { row: Row<CustomerRow> }) => (
          <RowMenuButton row={row} onEdit={openEditCustomer} />
        ),
      },
    ],
    [openEditCustomer],
  );

  const getCustomerUrl = (customerId: string) =>
    `/dashboard/customers/${customerId}`;

  const { table, ...tableProps } = useTable({
    data: data?.customers ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row, event) => {
      const url = getCustomerUrl(row.original.id);

      if (event.metaKey || event.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => window.open(getCustomerUrl(row.original.id), "_blank"),
    rowProps: (row) => ({
      onPointerEnter: () => router.prefetch(getCustomerUrl(row.original.id)),
    }),
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["email", "createdAt"],
    sortBy: sortBy === "created_at" ? "createdAt" : sortBy,
    sortOrder,
    onSortChange: ({ sortBy: nextSortBy, sortOrder: nextSortOrder }) => {
      const apiSortBy =
        nextSortBy === "createdAt" ? "created_at" : nextSortBy ?? "created_at";

      queryParams({
        set: {
          ...(nextSortBy && { sortBy: apiSortBy }),
          ...(nextSortOrder && { sortOrder: nextSortOrder }),
        },
        del: "page",
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `customer${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasCustomers = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <EditCustomerSheet />
      <CustomersFilters />

      {isLoading ? (
        <CustomersTableSkeleton />
      ) : hasCustomers ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No customers yet"
          isFiltered={isFiltered}
          description="Customers are created manually or automatically after checkout."
          icon={<Users className="size-4 text-neutral-700" />}
        />
      )}
    </div>
  );
}

function RowMenuButton({
  row,
  onEdit,
}: {
  row: Row<CustomerRow>;
  onEdit: (customer: CustomerRow) => void;
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
                onEdit(row.original);
                setIsOpen(false);
              }}
            >
              Edit customer
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(row.original.id), {
                  success: "Copied customer ID",
                });
                setIsOpen(false);
              }}
            >
              Copy ID
            </MenuItem>
            {row.original.email ? (
              <MenuItem
                as={Command.Item}
                icon={Copy}
                onSelect={() => {
                  toast.promise(copyToClipboard(row.original.email!), {
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
        className="h-8 whitespace-nowrap px-2 disabled:border-transparent disabled:bg-transparent"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
