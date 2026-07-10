"use client";

import { useCallback, useMemo } from "react";
import { SearchBoxPersisted } from "@/ui/shared/search-box-persisted";
import {
  AnimatedSizeContainer,
  Filter,
  useRouterStuff,
} from "@dub/ui";
import { CircleDollarOut } from "@dub/ui/icons";

export function useSettlementFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const filters = useMemo(
    () => [
      {
        key: "conversionType",
        icon: CircleDollarOut,
        label: "Type",
        options: [
          { value: "path", label: "Path payment" },
          { value: "direct", label: "Direct receive" },
        ],
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { conversionType } = searchParamsObj;

    return [
      ...(conversionType
        ? [{ key: "conversionType", value: conversionType }]
        : []),
    ];
  }, [searchParamsObj]);

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
      del: ["conversionType", "search", "page"],
    });
  }, [queryParams]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
  };
}

export function SettlementsFilters() {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
  } = useSettlementFilters();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
        />
        <SearchBoxPersisted
          placeholder="Search by payment, invoice, or tx hash"
          inputClassName="md:w-72"
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
