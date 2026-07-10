import type { WebhookEndpointRow } from "@/lib/webhooks/types";
import { cn } from "@dub/utils";

export function WebhookStatus({
  endpoint,
}: {
  endpoint: Pick<WebhookEndpointRow, "enabled">;
}) {
  const isEnabled = Boolean(endpoint.enabled);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        isEnabled
          ? "bg-green-100 text-green-600"
          : "bg-red-100 text-red-500",
      )}
    >
      {isEnabled ? "Enabled" : "Disabled"}
    </span>
  );
}
