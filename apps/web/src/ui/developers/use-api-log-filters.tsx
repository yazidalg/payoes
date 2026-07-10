"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import type { ApiKeyRow } from "@/lib/api-keys/types";
import {
  HTTP_METHODS,
  HTTP_STATUS_GROUPS,
} from "@/lib/api-logs/constants";
import { SearchBoxPersisted } from "@/ui/shared/search-box-persisted";
import {
  AnimatedSizeContainer,
  Filter,
  useRouterStuff,
} from "@dub/ui";
import {
  ArrowsOppositeDirectionX,
  CircleCheck,
  DatabaseKey,
} from "@dub/ui/icons";

export function useApiLogFilters({
  organizationId,
}: {
  organizationId: string;
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/api-keys`);
    const data = (await response.json()) as { apiKeys?: ApiKeyRow[] };
    return data.apiKeys ?? [];
  }, [organizationId]);

  const { data: apiKeys } = useAsyncData(fetchApiKeys, [organizationId]);

  const activeFilters = useMemo(() => {
    const { method, statusGroup, apiKeyId } = searchParamsObj;

    return [
      ...(method ? [{ key: "method", value: method }] : []),
      ...(statusGroup ? [{ key: "statusGroup", value: statusGroup }] : []),
      ...(apiKeyId ? [{ key: "apiKeyId", value: apiKeyId }] : []),
    ];
  }, [searchParamsObj]);

  const filters = useMemo(
    () => [
      {
        key: "statusGroup",
        icon: CircleCheck,
        label: "Status",
        options: HTTP_STATUS_GROUPS.map(({ value, label }) => ({
          value,
          label,
        })),
      },
      {
        key: "method",
        icon: ArrowsOppositeDirectionX,
        label: "Method",
        options: HTTP_METHODS.map((method) => ({
          value: method,
          label: method,
        })),
      },
      {
        key: "apiKeyId",
        icon: DatabaseKey,
        label: "API key",
        options: (apiKeys ?? []).map((apiKey) => ({
          value: apiKey.id,
          label: `${apiKey.name} (${apiKey.keyPrefix})`,
        })),
      },
    ],
    [apiKeys],
  );

  const onSelect = useCallback(
    (key: string, value: string) => {
      queryParams({
        set: { [key]: value },
        del: "page",
      });
    },
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) => {
      queryParams({
        del: [key, "page"],
      });
    },
    [queryParams],
  );

  const onRemoveAll = useCallback(() => {
    queryParams({
      del: ["method", "statusGroup", "apiKeyId", "search", "page"],
    });
  }, [queryParams]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSelectedFilter,
  };
}

export function ApiLogsFilters({
  organizationId,
}: {
  organizationId: string;
}) {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSelectedFilter,
  } = useApiLogFilters({ organizationId });

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          onSelectedFilterChange={setSelectedFilter}
        />
        <SearchBoxPersisted
          urlParam="search"
          placeholder="Search by endpoint path"
          inputClassName="md:w-80"
        />
      </div>
      <AnimatedSizeContainer height>
        <div>
          {activeFilters.length > 0 ? (
            <div className="pt-3">
              <Filter.List
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onRemoveAll={onRemoveAll}
              />
            </div>
          ) : null}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}
