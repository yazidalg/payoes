import { EmptyState } from "@dub/ui";
import { Webhook } from "@dub/ui/icons";

export function NoWebhookDeliveriesPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 bg-white py-10">
      <EmptyState
        icon={Webhook}
        title="No webhook deliveries yet"
        description="Send a test event to verify your endpoint is receiving callbacks."
        learnMore="/dashboard/developers/documentation"
      />
    </div>
  );
}
