"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useMemo, useState } from "react";
import type { WebhookDeliveryRow } from "@/lib/webhooks/types";
import { NoWebhookDeliveriesPlaceholder } from "@/ui/developers/no-webhook-deliveries-placeholder";
import { WebhookDeliveriesSkeleton } from "@/ui/developers/webhook-deliveries-skeleton";
import { WebhookDeliveryDetailsSheet } from "@/ui/developers/webhook-delivery-details-sheet";
import { WebhookDeliveryList } from "@/ui/developers/webhook-delivery-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { MaxWidthWrapper } from "@dub/ui";

export function WebhookEventLogsPanel({
  organizationId,
  webhookId,
  refreshKey = 0,
}: {
  organizationId: string;
  webhookId: string;
  refreshKey?: number;
}) {
  const fetchDeliveries = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/webhooks/${webhookId}`,
    );
    const data = (await response.json()) as {
      deliveries?: WebhookDeliveryRow[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load webhook deliveries");
    }

    return data.deliveries ?? [];
  }, [organizationId, webhookId, refreshKey]);

  const { data: deliveries, isLoading } = useAsyncData(fetchDeliveries, [
    organizationId,
    webhookId,
    refreshKey,
  ]);

  const [sheetState, setSheetState] = useState<
    { open: false; deliveryId: string | null } | { open: true; deliveryId: string }
  >({ open: false, deliveryId: null });

  const currentDelivery = useMemo(
    () =>
      sheetState.deliveryId
        ? deliveries?.find((delivery) => delivery.id === sheetState.deliveryId)
        : null,
    [deliveries, sheetState.deliveryId],
  );

  const [previousDeliveryId, nextDeliveryId] = useMemo(() => {
    if (!deliveries || !sheetState.deliveryId) {
      return [null, null];
    }

    const currentIndex = deliveries.findIndex(
      (delivery) => delivery.id === sheetState.deliveryId,
    );

    if (currentIndex === -1) {
      return [null, null];
    }

    return [
      currentIndex > 0 ? deliveries[currentIndex - 1].id : null,
      currentIndex < deliveries.length - 1
        ? deliveries[currentIndex + 1].id
        : null,
    ];
  }, [deliveries, sheetState.deliveryId]);

  return (
    <MaxWidthWrapper className="grid max-w-screen-lg gap-8 pb-10">
      {currentDelivery ? (
        <WebhookDeliveryDetailsSheet
          isOpen={sheetState.open}
          setIsOpen={(open) =>
            setSheetState((state) => ({ ...state, open }) as typeof sheetState)
          }
          delivery={currentDelivery}
          onPrevious={
            previousDeliveryId
              ? () =>
                  setSheetState({
                    open: true,
                    deliveryId: previousDeliveryId,
                  })
              : undefined
          }
          onNext={
            nextDeliveryId
              ? () =>
                  setSheetState({
                    open: true,
                    deliveryId: nextDeliveryId,
                  })
              : undefined
          }
        />
      ) : null}

      {isLoading ? (
        <WebhookDeliveriesSkeleton />
      ) : deliveries && deliveries.length > 0 ? (
        <WebhookDeliveryList
          deliveries={deliveries}
          selectedDeliveryId={sheetState.deliveryId}
          onDeliveryClick={(delivery) =>
            setSheetState({ open: true, deliveryId: delivery.id })
          }
        />
      ) : (
        <NoWebhookDeliveriesPlaceholder />
      )}
    </MaxWidthWrapper>
  );
}
