"use client";

import { useCallback, useMemo } from "react";
import { SearchBoxPersisted } from "@/ui/shared/search-box-persisted";
import {
  AnimatedSizeContainer,
  Filter,
  useRouterStuff,
} from "@dub/ui";
import { CircleCheck, Users } from "@dub/ui/icons";

export function usePaymentFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleCheck,
        label: "Status",
        options: [
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
          { value: "failed", label: "Failed" },
          { value: "expired", label: "Expired" },
        ],
      },
      {
        key: "customerStatus",
        icon: Users,
        label: "Customer",
        options: [
          { value: "has_customer", label: "Has customer" },
          { value: "no_customer", label: "No customer" },
        ],
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { status, customerStatus } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(customerStatus
        ? [{ key: "customerStatus", value: customerStatus }]
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
      del: ["status", "customerStatus", "search", "page"],
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

export function PaymentsFilters() {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
  } = usePaymentFilters();

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
          placeholder="Search by payment ID, payer, or notes"
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
