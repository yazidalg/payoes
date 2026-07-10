import type { PaymentLinkRow } from "@/lib/payments/types";
import {
  CalendarIcon,
  CopyText,
  StatusBadge,
  TimestampTooltip,
} from "@dub/ui";
import { Hyperlink } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import type { HTMLProps } from "react";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import {
  formatPaymentLinkAmount,
  getPaymentLinkStatusVariant,
} from "./payment-formatters";

export function PaymentLinkDetailsColumn({
  link,
  isLoading = false,
}: {
  link?: PaymentLinkRow;
  isLoading?: boolean;
}) {
  const basicFields = [
    link?.currency_code
      ? {
          id: "currency",
          icon: <Hyperlink className="size-3.5 shrink-0" />,
          text: <span>{link.currency_code}</span>,
        }
      : null,
    link?.created_at
      ? {
          id: "created",
          icon: <CalendarIcon className="size-3.5 shrink-0" />,
          text: (
            <span>
              Created{" "}
              <TimestampTooltip
                timestamp={link.created_at}
                rows={["local", "utc"]}
                side="left"
              >
                <span>
                  {new Date(link.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </TimestampTooltip>
            </span>
          ),
        }
      : null,
    link?.updated_at
      ? {
          id: "updated",
          icon: <CalendarIcon className="size-3.5 shrink-0" />,
          text: (
            <span>
              Updated{" "}
              <TimestampTooltip
                timestamp={link.updated_at}
                rows={["local", "utc"]}
                side="left"
              >
                <span>
                  {new Date(link.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </TimestampTooltip>
            </span>
          ),
        }
      : null,
  ].filter((field): field is NonNullable<typeof field> => field !== null);

  const title = link?.product_name ?? (link ? formatPaymentLinkAmount(link) : "");

  return (
    <div className="grid grid-cols-1 gap-6 overflow-hidden whitespace-nowrap text-sm text-neutral-900">
      <div className="border-border-subtle flex flex-col divide-y divide-neutral-200 rounded-xl border bg-white">
        <div className="p-4">
          <div className="bg-bg-subtle flex size-10 items-center justify-center rounded-full border border-neutral-100">
            <Hyperlink className="size-4 text-neutral-600" />
          </div>

          <div className="mt-3">
            {link ? (
              <div className="flex flex-col items-start gap-1 text-left">
                <span className="text-content-emphasis text-base font-semibold">
                  {title}
                </span>
                <CopyText
                  value={link.id}
                  className="block w-fit text-left font-mono text-xs text-neutral-500"
                >
                  {link.id}
                </CopyText>
              </div>
            ) : (
              <div className="space-y-2">
                <SmoothSkeleton className="h-5 w-32" />
                <SmoothSkeleton className="h-3 w-24" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {link ? (
            <StatusBadge variant={getPaymentLinkStatusVariant(link.active)} icon={null}>
              {link.active ? "Active" : "Inactive"}
            </StatusBadge>
          ) : null}

          {isLoading && !link
            ? ["w-32", "w-40", "w-28"].map((width) => (
                <SmoothSkeleton key={width} className={cn("h-4", width)} />
              ))
            : basicFields.map(({ id, icon, text }) => (
                <div key={id} className="text-content-default flex items-center gap-1.5">
                  {icon}
                  <span className="min-w-0 truncate text-xs font-medium">{text}</span>
                </div>
              ))}
        </div>

        <div className="p-4">
          <DetailHeading>Environment</DetailHeading>
          <div className="mt-2.5 text-xs text-neutral-600">
            {isLoading && !link ? (
              <SmoothSkeleton className="h-4 w-20" />
            ) : (
              <p className="capitalize">{link?.environment ?? "-"}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailHeading({ className, ...rest }: HTMLProps<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-content-emphasis text-xs font-semibold", className)}
      {...rest}
    />
  );
}
