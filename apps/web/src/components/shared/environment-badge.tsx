import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { TestTubeDiagonalIcon } from "lucide-react";

export function EnvironmentBadge({
  environment,
  className,
}: {
  environment: Organization["environment"];
  className?: string;
}) {
  if (environment !== "sandbox") {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200",
        className
      )}
    >
      <TestTubeDiagonalIcon className="size-3" />
      Sandbox
    </span>
  );
}

export function getInvoiceEnvironmentLabel(
  environment: Organization["environment"]
) {
  return environment === "sandbox" ? "Sandbox test mode" : null;
}
