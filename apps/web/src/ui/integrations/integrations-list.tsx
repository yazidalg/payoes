"use client";

import { useCallback, useMemo } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import type { IntegrationListItem } from "@/lib/integrations/types";
import { IntegrationCard } from "@/ui/integrations/integration-card";
import { IntegrationPlaceholder } from "@/ui/integrations/integration-placeholder";

function buildCatalogFallback(): IntegrationListItem[] {
  return INTEGRATION_CATALOG.map((item) => ({
    ...item,
    integration: null,
  }));
}

export function IntegrationsList({
  organizationId,
  refreshKey = 0,
}: {
  organizationId: string;
  refreshKey?: number;
}) {
  const catalogFallback = useMemo(() => buildCatalogFallback(), []);

  const fetchIntegrations = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/integrations`);
    const data = (await response.json()) as {
      integrations?: IntegrationListItem[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load integrations");
    }

    return data.integrations ?? [];
  }, [organizationId]);

  const { data: integrations, error, isLoading } = useAsyncData(
    fetchIntegrations,
    [organizationId, refreshKey],
  );

  const items = integrations ?? (error ? catalogFallback : []);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {isLoading ? (
        catalogFallback.map((item) => (
          <IntegrationPlaceholder key={item.id} />
        ))
      ) : (
        items.map((item) => <IntegrationCard key={item.id} item={item} />)
      )}
    </div>
  );
}
