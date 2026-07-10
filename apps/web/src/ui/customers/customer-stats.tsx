import type { CustomerPaymentRow } from "@/lib/customers/types";
import { TimestampTooltip } from "@dub/ui";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { cn } from "@dub/utils";
import { useMemo, type CSSProperties } from "react";

export function CustomerStats({
  payments,
  isLoading = false,
}: {
  payments?: CustomerPaymentRow[];
  isLoading?: boolean;
}) {
  const stats = useMemo(() => {
    const sorted = [...(payments ?? [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const completed = sorted.filter((payment) => payment.status === "completed");

    return [
      {
        label: "Total payments",
        value: payments ? String(payments.length) : undefined,
      },
      {
        label: "Completed",
        value: payments ? String(completed.length) : undefined,
      },
      {
        label: "First payment",
        value:
          sorted.length > 0 ? (
            <TimestampTooltip
              timestamp={sorted[0].created_at}
              rows={["local", "utc"]}
              side="right"
            >
              <span className="underline decoration-dotted underline-offset-2">
                {new Date(sorted[0].created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </TimestampTooltip>
          ) : (
            "-"
          ),
      },
      {
        label: "Latest payment",
        value:
          sorted.length > 0 ? (
            <TimestampTooltip
              timestamp={sorted[sorted.length - 1].created_at}
              rows={["local", "utc"]}
              side="right"
            >
              <span className="underline decoration-dotted underline-offset-2">
                {new Date(sorted[sorted.length - 1].created_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </span>
            </TimestampTooltip>
          ) : (
            "-"
          ),
      },
    ];
  }, [payments]);

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
