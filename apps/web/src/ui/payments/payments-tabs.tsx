"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback } from "react";
import NumberFlow from "@number-flow/react";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  DEFAULT_PAYMENTS_TAB,
  PAYMENTS_TAB_LABELS,
  PAYMENTS_TABS,
  type PaymentsTab,
} from "@/lib/navigation/payments-tabs";
import type { PaymentsHubCounts } from "@/lib/payments/hub-counts";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";

export function PaymentsTabs({
  organizationId,
  activeTab,
  reloadKey = 0,
}: {
  organizationId: string;
  activeTab: PaymentsTab;
  reloadKey?: number;
}) {
  const { queryParams } = useRouterStuff();

  const fetchCounts = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/payments/counts`,
    );
    const data = (await response.json()) as {
      counts?: PaymentsHubCounts;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load payment counts");
    }

    return data.counts ?? {
      "payment-intents": 0,
      invoices: 0,
      "payment-links": 0,
    };
  }, [organizationId]);

  const { data: counts, isLoading } = useAsyncData(fetchCounts, [
    organizationId,
    reloadKey,
  ]);

  const onTabClick = useCallback(
    (tab: PaymentsTab) => {
      const filterKeys = [
        "page",
        "search",
        "sortBy",
        "sortOrder",
        "customerStatus",
        "status",
        "walletStatus",
        "emailStatus",
        "paymentStatus",
      ];

      if (tab === DEFAULT_PAYMENTS_TAB) {
        queryParams({
          del: ["tab", ...filterKeys],
          replace: true,
        });
        return;
      }

      queryParams({
        set: { tab },
        del: filterKeys,
        replace: true,
      });
    },
    [queryParams],
  );

  return (
    <div className="grid w-full grid-cols-2 gap-2 overflow-x-auto sm:gap-4 lg:grid-cols-3">
      {PAYMENTS_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={cn(
            "flex min-w-0 justify-between gap-4 rounded-xl border bg-white px-5 py-4 text-left transition-[box-shadow] focus:outline-none",
            activeTab === tab
              ? "border-primary shadow-[0_0_0_1px_var(--primary)_inset]"
              : "border-neutral-200 focus-visible:border-primary",
          )}
          onClick={() => onTabClick(tab)}
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-neutral-600">
              {PAYMENTS_TAB_LABELS[tab]}
            </p>
            <div className="mt-2">
              {counts && !isLoading ? (
                <NumberFlow
                  value={counts[tab]}
                  className="text-2xl font-medium text-neutral-900"
                  format={{
                    notation: counts[tab] > 999999 ? "compact" : "standard",
                  }}
                />
              ) : (
                <SmoothSkeleton className="h-8 w-12" />
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
