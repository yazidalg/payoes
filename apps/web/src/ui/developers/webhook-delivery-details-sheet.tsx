"use client";

import type { WebhookDeliveryRow } from "@/lib/webhooks/types";
import {
  Button,
  CopyText,
  Sheet,
} from "@dub/ui";
import {
  ChevronLeft,
  ChevronRight,
  Xmark,
} from "@dub/ui/icons";
import type { Dispatch, SetStateAction } from "react";

export function WebhookDeliveryDetailsSheet({
  isOpen,
  setIsOpen,
  delivery,
  onPrevious,
  onNext,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  delivery: WebhookDeliveryRow | null;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  if (!delivery) {
    return null;
  }

  const responseBody =
    delivery.responseBody ??
    (delivery.lastError ? JSON.stringify({ error: delivery.lastError }, null, 2) : null);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex size-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="flex flex-col">
            <p className="text-lg font-semibold">{delivery.event}</p>
            <CopyText
              value={delivery.id}
              className="truncate font-mono text-xs text-neutral-400 transition-colors hover:text-neutral-600"
            >
              {delivery.id}
            </CopyText>
          </Sheet.Title>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Button
                type="button"
                disabled={!onPrevious}
                onClick={onPrevious}
                variant="secondary"
                className="size-9 rounded-l-lg rounded-r-none p-0"
                icon={<ChevronLeft className="size-3.5" />}
              />
              <Button
                type="button"
                disabled={!onNext}
                onClick={onNext}
                variant="secondary"
                className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
                icon={<ChevronRight className="size-3.5" />}
              />
            </div>
            <Sheet.Close>
              <Button
                type="button"
                variant="outline"
                className="size-9 p-0"
                icon={<Xmark className="size-4" />}
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-900">Response</h3>
            <p className="text-sm text-neutral-500">
              HTTP {delivery.responseStatus ?? "N/A"} · {delivery.status} ·{" "}
              {delivery.attempts}/{delivery.maxAttempts} attempts
            </p>
            {responseBody ? (
              <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700">
                {responseBody}
              </pre>
            ) : (
              <p className="text-sm text-neutral-400">No response body</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-900">Request</h3>
            <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700">
              {JSON.stringify(delivery.payload, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </Sheet>
  );
}
