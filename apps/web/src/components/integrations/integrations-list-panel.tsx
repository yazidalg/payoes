"use client";

import { useMemo } from "react";
import { IntegrationsList } from "@/ui/integrations/integrations-list";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";

export function IntegrationsListPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Connect Shopify or WooCommerce to create Payoes payments from new store orders.",
        href: "/dashboard/developers/documentation",
      },
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  return <IntegrationsList organizationId={organizationId} />;
}
