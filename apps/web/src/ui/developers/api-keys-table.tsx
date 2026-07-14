"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import { scopesToName } from "@/lib/api-keys/scopes";
import type { ApiKeyRow } from "@/lib/api-keys/types";
import { ApiKeysTableSkeleton } from "@/ui/developers/api-keys-table-skeleton";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { Button, MenuItem, Popover, Table, usePagination, useTable } from "@dub/ui";
import { DatabaseKey, Dots, Key, PenWriting, Trash } from "@dub/ui/icons";
import { cn, formatDate, timeAgo } from "@dub/utils";
import type { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { toast } from "sonner";

export function ApiKeysTable({ organizationId, refreshKey = 0, onCreateClick, onRowClick, onEdit, onRevoked }: { organizationId: string; refreshKey?: number; onCreateClick?: () => void; onRowClick?: (apiKey: ApiKeyRow) => void; onEdit?: (apiKey: ApiKeyRow) => void; onRevoked?: () => void }) {
  const { pagination, setPagination } = usePagination();
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const fetchKeys = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/api-keys`);
    const data = (await response.json()) as {
      apiKeys?: ApiKeyRow[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load API keys");
    }

    return data.apiKeys ?? [];
  }, [organizationId]);

  const { data: keys, error, isLoading } = useAsyncData(fetchKeys, [organizationId, refreshKey, localRefreshKey]);

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        minSize: 160,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => (
          <span className="flex items-center gap-2">
            <Key className="size-4 text-neutral-500" />
            <span className={cn(row.original.revokedAt && "text-neutral-400 line-through")}>{row.original.name}</span>
          </span>
        ),
      },
      {
        id: "permissions",
        header: "Permissions",
        accessorKey: "scopes",
        minSize: 120,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => scopesToName(row.original.scopes ?? ["apis.all"]).name,
      },
      {
        id: "environment",
        header: "Environment",
        accessorKey: "environment",
        minSize: 120,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => <span className="capitalize">{row.original.environment}</span>,
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "createdAt",
        minSize: 120,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => formatDate(row.original.createdAt, { month: "short" }),
      },
      {
        id: "keyPrefix",
        header: "Key",
        accessorKey: "keyPrefix",
        minSize: 140,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => <span className="font-mono text-xs text-neutral-600">{row.original.keyPrefix}</span>,
      },
      {
        id: "lastUsedAt",
        header: "Last used",
        accessorKey: "lastUsedAt",
        minSize: 120,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => (row.original.lastUsedAt ? timeAgo(new Date(row.original.lastUsedAt)) : "Never"),
      },
      {
        id: "menu",
        enableHiding: false,
        cell: ({ row }: { row: Row<ApiKeyRow> }) => (
          <RowMenuButton
            row={row}
            organizationId={organizationId}
            onEdit={onEdit}
            onRevoked={() => {
              setLocalRefreshKey((current) => current + 1);
              onRevoked?.();
            }}
          />
        ),
      },
    ],
    [organizationId, onEdit, onRevoked],
  );

  const { table, ...tableProps } = useTable({
    data: keys ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: onRowClick
      ? (row) => {
          if (!row.original.revokedAt) {
            onRowClick(row.original);
          }
        }
      : undefined,
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `API key${plural ? "s" : ""}`,
    rowCount: keys?.length ?? 0,
    error: error ?? undefined,
  });

  const hasKeys = (keys?.length ?? 0) > 0;

  return <div className="grid grid-cols-1">{isLoading ? <ApiKeysTableSkeleton /> : hasKeys ? <Table {...tableProps} table={table} /> : <TableEmptyState title="No API keys found" description="No API keys have been created for this organization yet." icon={<DatabaseKey className="size-4 text-neutral-700" />} />}</div>;
}

function RowMenuButton({ row, organizationId, onEdit, onRevoked }: { row: Row<ApiKeyRow>; organizationId: string; onEdit?: (apiKey: ApiKeyRow) => void; onRevoked: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const apiKey = row.original;
  const isRevoked = Boolean(apiKey.revokedAt);

  async function handleRevoke() {
    const response = await fetch(`/api/organizations/${organizationId}/api-keys/${apiKey.id}`, { method: "DELETE" });

    if (!response.ok) {
      throw new Error("Unable to revoke API key");
    }
  }

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[140px]">
            {!isRevoked ? (
              <MenuItem
                as={Command.Item}
                icon={PenWriting}
                onSelect={() => {
                  onEdit?.(apiKey);
                  setIsOpen(false);
                }}>
                Edit
              </MenuItem>
            ) : null}
            {!isRevoked ? (
              <MenuItem
                as={Command.Item}
                icon={Trash}
                variant="danger"
                onSelect={() => {
                  setIsOpen(false);
                  toast.promise(handleRevoke(), {
                    loading: "Revoking API key...",
                    success: () => {
                      onRevoked();
                      return "API key revoked";
                    },
                    error: (err) => (err instanceof Error ? err.message : "Unable to revoke API key"),
                  });
                }}>
                Revoke
              </MenuItem>
            ) : null}
          </Command.List>
        </Command>
      }
      align="end">
      <Button type="button" className="size-8 shrink-0 whitespace-nowrap rounded-lg p-0" variant="outline" icon={<Dots className="h-4 w-4 shrink-0" />} />
    </Popover>
  );
}
