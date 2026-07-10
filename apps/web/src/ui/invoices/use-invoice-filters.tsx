"use client";

import { useCallback, useMemo } from "react";
import { SearchBoxPersisted } from "@/ui/shared/search-box-persisted";
import {
  AnimatedSizeContainer,
  Filter,
  useRouterStuff,
} from "@dub/ui";
import { CircleCheck } from "@dub/ui/icons";

export function useInvoiceFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleCheck,
        label: "Status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "open", label: "Open" },
          { value: "paid", label: "Paid" },
          { value: "void", label: "Void" },
        ],
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { status } = searchParamsObj;
    return [...(status ? [{ key: "status", value: status }] : [])];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: string) => {
      queryParams({ set: { [key]: value }, del: "page" });
    },
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) => {
      queryParams({ del: [key, "page"] });
    },
    [queryParams],
  );

  const onRemoveAll = useCallback(() => {
    queryParams({ del: ["status", "search", "page"] });
  }, [queryParams]);

  return { filters, activeFilters, onSelect, onRemove, onRemoveAll };
}

export function InvoicesFilters() {
  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    useInvoiceFilters();

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
          placeholder="Search by invoice, customer, or description"
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
