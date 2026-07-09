"use client";

import { useCallback } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import type { DashboardAnalytics } from "@/lib/analytics/types";

type DateRangeState = {
  from: Date | undefined;
  to?: Date | undefined;
};

export function useDashboardAnalytics(
  organizationId: string,
  dateRange: DateRangeState,
) {
  const fetchAnalytics = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) {
      return null;
    }

    const params = new URLSearchParams({
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    });

    const response = await fetch(
      `/api/organizations/${organizationId}/analytics?${params.toString()}`,
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? "Unable to load analytics");
    }

    return (await response.json()) as DashboardAnalytics;
  }, [organizationId, dateRange.from, dateRange.to]);

  return useAsyncData(fetchAnalytics, [
    organizationId,
    dateRange.from?.toISOString(),
    dateRange.to?.toISOString(),
  ]);
}
