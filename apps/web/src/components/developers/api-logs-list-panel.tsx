"use client";

import { useMemo } from "react";
import { ApiLogsTable } from "@/ui/developers/api-logs-table";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";

export function ApiLogsListPanel({ organizationId }: { organizationId: string }) {
  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "View request logs for API calls made with your business API keys.",
        href: "/dashboard/developers/documentation",
      },
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  return <ApiLogsTable organizationId={organizationId} />;
}
