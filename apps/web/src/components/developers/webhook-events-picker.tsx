"use client";

import { WEBHOOK_EVENTS } from "@/constants/webhooks/events";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<(typeof WEBHOOK_EVENTS)[number], string> = {
  "payment.created": "Payment created",
  "payment.completed": "Payment completed",
  "payment.failed": "Payment failed",
  "payment.expired": "Payment expired",
  "payment.refunded": "Payment refunded",
  "payment.settlement_failed": "Payment settlement failed",
};

export function WebhookEventsPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (events: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(event: (typeof WEBHOOK_EVENTS)[number]) {
    if (value.includes(event)) {
      onChange(value.filter((item) => item !== event));
      return;
    }

    onChange([...value, event]);
  }

  return (
    <div className="space-y-2">
      <Label>Events</Label>
      <div className="space-y-2 rounded-lg border p-3">
        {WEBHOOK_EVENTS.map((event) => {
          const checked = value.includes(event);

          return (
            <label
              key={event}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50",
                disabled && "pointer-events-none opacity-60"
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(event)}
              />
              <span>
                <span className="block font-mono text-xs">{event}</span>
                <span className="block text-xs text-muted-foreground">
                  {EVENT_LABELS[event]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
