"use client";

import type { WebhookDeliveryRow } from "@/lib/webhooks/types";
import { TimestampTooltip } from "@dub/ui";
import { CircleCheck, CircleHalfDottedClock } from "@dub/ui/icons";
import { formatDateTimeSmart } from "@dub/utils";

export function WebhookDeliveryList({
  deliveries,
  selectedDeliveryId,
  onDeliveryClick,
}: {
  deliveries: WebhookDeliveryRow[];
  selectedDeliveryId?: string | null;
  onDeliveryClick: (delivery: WebhookDeliveryRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <div className="flex flex-col divide-y divide-neutral-200">
        {deliveries.map((delivery) => {
          const isSuccess =
            delivery.status === "delivered" ||
            (delivery.responseStatus !== null &&
              delivery.responseStatus >= 200 &&
              delivery.responseStatus < 300);

          return (
            <button
              key={delivery.id}
              type="button"
              onClick={() => onDeliveryClick(delivery)}
              className={`flex items-center justify-between gap-5 px-3.5 py-3 text-left focus:outline-none ${
                selectedDeliveryId === delivery.id
                  ? "bg-neutral-50"
                  : "hover:bg-neutral-50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-5">
                <div className="flex items-center gap-2.5">
                  {isSuccess ? (
                    <CircleCheck className="size-4 shrink-0 text-green-500" />
                  ) : (
                    <CircleHalfDottedClock className="size-4 shrink-0 text-amber-500" />
                  )}
                  <div className="text-sm text-neutral-500">
                    {delivery.responseStatus ?? "-"}
                  </div>
                </div>
                <div className="truncate text-sm text-neutral-500">
                  {delivery.event}
                </div>
              </div>

              <TimestampTooltip
                timestamp={delivery.createdAt}
                side="right"
                rows={["local", "utc"]}
              >
                <div className="shrink-0 text-xs text-neutral-400">
                  {formatDateTimeSmart(delivery.createdAt)}
                </div>
              </TimestampTooltip>
            </button>
          );
        })}
      </div>
    </div>
  );
}
