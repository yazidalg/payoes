"use client";

import { useMemo } from "react";
import { TransactionsTable } from "@/ui/transactions/transactions-table";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import type { Organization } from "@/lib/db/schema";

export function TransactionsListPanel({
  organizationId,
  environment,
}: {
  organizationId: string;
  environment: Organization["environment"];
}) {
  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Confirmed blockchain payments for your organization.",
        href: "/dashboard/developers/documentation",
      },
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  return (
    <TransactionsTable
      organizationId={organizationId}
      environment={environment}
    />
  );
}
