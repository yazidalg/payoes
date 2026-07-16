import type { OrganizationIntegration } from "@/lib/db/schema";
import { cn } from "@dub/utils";

function getStatusLabel(status: OrganizationIntegration["status"] | null | undefined) {
  switch (status) {
    case "connected":
      return "Connected";
    case "pending":
      return "Pending";
    case "error":
      return "Error";
    case "disconnected":
      return "Disconnected";
    default:
      return "Not connected";
  }
}

function getStatusClassName(status: OrganizationIntegration["status"] | null | undefined) {
  switch (status) {
    case "connected":
      return "bg-green-100 text-green-600";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "error":
      return "bg-red-100 text-red-500";
    default:
      return "bg-neutral-100 text-neutral-500";
  }
}

export function IntegrationStatus({
  integration,
}: {
  integration: OrganizationIntegration | null | undefined;
}) {
  const status = integration?.status ?? null;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        getStatusClassName(status),
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
