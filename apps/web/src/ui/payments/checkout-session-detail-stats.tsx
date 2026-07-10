import type { CheckoutSessionRow } from "@/lib/payments/types";
import { StatusBadge } from "@dub/ui";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";
import type { CSSProperties } from "react";
import {
  formatCheckoutSessionAmount,
  getCheckoutSessionStatusVariant,
} from "./payment-formatters";

export function CheckoutSessionDetailStats({
  session,
  isLoading = false,
}: {
  session?: CheckoutSessionRow;
  isLoading?: boolean;
}) {
  const stats = [
    {
      label: "Amount",
      value: session ? formatCheckoutSessionAmount(session) : undefined,
    },
    {
      label: "Session status",
      value: session ? (
        <StatusBadge
          variant={getCheckoutSessionStatusVariant(session.status)}
          icon={null}
        >
          {session.status}
        </StatusBadge>
      ) : undefined,
    },
    {
      label: "Payment status",
      value: session ? (
        <span className="capitalize">{session.payment_status ?? "-"}</span>
      ) : undefined,
    },
    {
      label: "Customer",
      value: session?.customer_id ?? "-",
    },
  ];

  return (
    <div className="@container/stats">
      <div
        className={cn(
          "@xs/stats:grid-cols-[repeat(var(--cols),1fr)] grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200",
        )}
        style={{ "--cols": stats.length } as CSSProperties}
      >
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col bg-white p-3">
            <span className="text-xs text-neutral-500">{label}</span>
            {isLoading || value === undefined ? (
              <SmoothSkeleton className="mt-1 h-5 w-16" />
            ) : (
              <span className="text-content-emphasis mt-1 text-sm font-medium">
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
