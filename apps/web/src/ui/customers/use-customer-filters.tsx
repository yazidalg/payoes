"use client";

import { useCallback, useMemo } from "react";
import { SearchBoxPersisted } from "@/ui/shared/search-box-persisted";
import {
  AnimatedSizeContainer,
  Filter,
  useRouterStuff,
} from "@dub/ui";
import { CreditCard, Envelope } from "@dub/ui/icons";
import { Wallet } from "lucide-react";

export function useCustomerFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const filters = useMemo(
    () => [
      {
        key: "walletStatus",
        icon: Wallet,
        label: "Wallet",
        options: [
          { value: "linked", label: "Linked wallet" },
          { value: "unlinked", label: "No wallet" },
        ],
      },
      {
        key: "emailStatus",
        icon: Envelope,
        label: "Email",
        options: [
          { value: "present", label: "Has email" },
          { value: "missing", label: "No email" },
        ],
      },
      {
        key: "paymentStatus",
        icon: CreditCard,
        label: "Payments",
        options: [
          { value: "has_payments", label: "Has payments" },
          { value: "no_payments", label: "No payments" },
        ],
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { walletStatus, emailStatus, paymentStatus } = searchParamsObj;

    return [
      ...(walletStatus ? [{ key: "walletStatus", value: walletStatus }] : []),
      ...(emailStatus ? [{ key: "emailStatus", value: emailStatus }] : []),
      ...(paymentStatus ? [{ key: "paymentStatus", value: paymentStatus }] : []),
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
      del: ["walletStatus", "emailStatus", "paymentStatus", "search", "page"],
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

export function CustomersFilters() {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
  } = useCustomerFilters();

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
          placeholder="Search by name, email, wallet, or ID"
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
