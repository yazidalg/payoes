"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import { API_LOGS_PAGE_SIZE, METHOD_BADGE_VARIANTS } from "@/lib/api-logs/constants";
import { getStatusCodeBadgeVariant } from "@/lib/api-logs/log-utils";
import type { ApiLogRow } from "@/lib/api-logs/types";
import { ApiLogsFilters } from "@/ui/developers/use-api-log-filters";
import { ApiLogsTableSkeleton } from "@/ui/developers/api-logs-table-skeleton";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import {
  EditColumnsButton,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { StackY3 } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import type { Row, Table as TableType } from "@tanstack/react-table";

type ApiLogsListResponse = {
  logs: ApiLogRow[];
  total: number;
};

const apiLogsColumns = {
  all: ["path", "method", "statusCode", "apiKey", "duration", "timestamp"],
  defaultVisible: ["path", "method", "statusCode", "apiKey", "duration", "timestamp"],
};

export function ApiLogsTable({ organizationId }: { organizationId: string }) {
  const { searchParams } = useRouterStuff();

  const search = searchParams.get("search") ?? "";
  const method = searchParams.get("method") ?? "";
  const statusGroup = searchParams.get("statusGroup") ?? "";
  const apiKeyId = searchParams.get("apiKeyId") ?? "";
  const isFiltered = Boolean(search || method || statusGroup || apiKeyId);

  const { pagination, setPagination } = usePagination(API_LOGS_PAGE_SIZE);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payoes-api-logs-table-columns",
    apiLogsColumns,
  );

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex),
      pageSize: String(pagination.pageSize),
    });

    if (search) {
      params.set("search", search);
    }

    if (method) {
      params.set("method", method);
    }

    if (statusGroup) {
      params.set("statusGroup", statusGroup);
    }

    if (apiKeyId) {
      params.set("apiKeyId", apiKeyId);
    }

    const response = await apiFetch(
      `/api/organizations/${organizationId}/api-logs?${params.toString()}`,
    );
    const data = (await response.json()) as ApiLogsListResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load API logs");
    }

    return data;
  }, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    method,
    statusGroup,
    apiKeyId,
  ]);

  const { data, error, isLoading } = useAsyncData(fetchLogs, [
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    method,
    statusGroup,
    apiKeyId,
  ]);

  const columns = useMemo(
    () => [
      {
        id: "path",
        header: "Endpoint",
        minSize: 240,
        cell: ({ row }: { row: Row<ApiLogRow> }) => (
          <span className="truncate font-mono text-xs" title={row.original.path}>
            {row.original.path}
          </span>
        ),
      },
      {
        id: "method",
        header: "Method",
        minSize: 100,
        cell: ({ row }: { row: Row<ApiLogRow> }) => (
          <StatusBadge
            variant={METHOD_BADGE_VARIANTS[row.original.method] ?? "neutral"}
            icon={null}
          >
            {row.original.method}
          </StatusBadge>
        ),
      },
      {
        id: "statusCode",
        header: "Status",
        minSize: 100,
        cell: ({ row }: { row: Row<ApiLogRow> }) => (
          <StatusBadge
            variant={getStatusCodeBadgeVariant(row.original.statusCode)}
            icon={null}
          >
            {row.original.statusCode}
          </StatusBadge>
        ),
      },
      {
        id: "apiKey",
        header: "API key",
        minSize: 180,
        cell: ({ row }: { row: Row<ApiLogRow> }) => {
          if (!row.original.apiKeyPrefix) {
            return <span className="text-sm text-neutral-400">-</span>;
          }

          return (
            <span
              className="truncate font-mono text-xs text-neutral-500"
              title={
                row.original.apiKeyName
                  ? `${row.original.apiKeyPrefix} (${row.original.apiKeyName})`
                  : row.original.apiKeyPrefix
              }
            >
              {row.original.apiKeyPrefix}
              {row.original.apiKeyName ? (
                <span className="ml-1 font-sans text-neutral-400">
                  ({row.original.apiKeyName})
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "duration",
        header: "Duration",
        minSize: 100,
        cell: ({ row }: { row: Row<ApiLogRow> }) => (
          <span className="text-sm text-neutral-500">
            {row.original.durationMs}ms
          </span>
        ),
      },
      {
        id: "timestamp",
        header: "Time",
        minSize: 160,
        cell: ({ row }: { row: Row<ApiLogRow> }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            rows={["local", "utc"]}
            side="left"
            delayDuration={150}
          >
            <span className="text-sm text-neutral-500">
              {formatDate(row.original.createdAt, { month: "short" })}
            </span>
          </TimestampTooltip>
        ),
      },
      {
        id: "menu",
        enableHiding: false,
        header: ({ table }: { table: TableType<ApiLogRow> }) => (
          <EditColumnsButton table={table} />
        ),
        cell: () => null,
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: data?.logs ?? [],
    columns,
    columnPinning: { right: ["menu"] },
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `log${plural ? "s" : ""}`,
    rowCount: data?.total ?? 0,
    error: error ?? undefined,
  });

  const hasLogs = (data?.total ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <ApiLogsFilters organizationId={organizationId} />

      {isLoading ? (
        <ApiLogsTableSkeleton />
      ) : hasLogs ? (
        <Table {...tableProps} table={table} />
      ) : (
        <TableEmptyState
          title="No API logs yet"
          isFiltered={isFiltered}
          filteredTitle="No API logs found"
          description="API requests made with your keys will appear here."
          icon={<StackY3 className="size-4 text-neutral-700" />}
        />
      )}
    </div>
  );
}
