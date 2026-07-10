import type { CustomerRow } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";
import {
  CalendarIcon,
  CopyText,
  Envelope,
  TimestampTooltip,
} from "@dub/ui";
import { Wallet } from "lucide-react";
import { cn } from "@dub/utils";
import type { HTMLProps } from "react";
import { CustomerAvatar } from "./customer-avatar";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

export function CustomerDetailsColumn({
  customer,
  isLoading = false,
}: {
  customer?: CustomerRow;
  isLoading?: boolean;
}) {
  const basicFields = [
    customer?.email
      ? {
          id: "email",
          icon: <Envelope className="size-3.5 shrink-0" />,
          text: (
            <CopyText
              value={customer.email}
              className="min-w-0 truncate text-xs font-medium"
            >
              {customer.email}
            </CopyText>
          ),
        }
      : null,
    customer?.primary_stellar_address
      ? {
          id: "wallet",
          icon: <Wallet className="size-3.5 shrink-0" />,
          text: (
            <CopyText
              value={customer.primary_stellar_address}
              className="min-w-0 truncate font-mono text-xs font-medium"
            >
              {customer.primary_stellar_address}
            </CopyText>
          ),
        }
      : null,
    customer?.created_at
      ? {
          id: "since",
          icon: <CalendarIcon className="size-3.5 shrink-0" />,
          text: (
            <span>
              Since{" "}
              <TimestampTooltip
                timestamp={customer.created_at}
                rows={["local", "utc"]}
                side="left"
              >
                <span>
                  {new Date(customer.created_at).toLocaleDateString("en-US", {
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

  return (
    <div className="grid grid-cols-1 gap-6 overflow-hidden whitespace-nowrap text-sm text-neutral-900">
      <div className="border-border-subtle flex flex-col divide-y divide-neutral-200 rounded-xl border bg-white">
        <div className="p-4">
          <div className="relative w-fit">
            {customer ? (
              <CustomerAvatar
                customer={customer}
                className="size-10 border border-neutral-100"
              />
            ) : (
              <SmoothSkeleton className="size-10 rounded-full" />
            )}
          </div>

          <div className="mt-3">
            {customer ? (
              <div className="flex flex-col items-start gap-1 text-left">
                <span className="text-content-emphasis text-base font-semibold">
                  {formatCustomerLabel(customer)}
                </span>
                <CopyText
                  value={customer.id}
                  className="block w-fit text-left font-mono text-xs text-neutral-500"
                >
                  {customer.id}
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
          {isLoading && !customer
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
          <DetailHeading>Notes</DetailHeading>
          <div className="mt-2.5 text-xs text-neutral-600">
            {isLoading && !customer ? (
              <SmoothSkeleton className="h-16 w-full rounded-lg" />
            ) : (
              <p className="whitespace-pre-wrap break-words">
                {customer?.notes?.trim() ? customer.notes : "No notes yet."}
              </p>
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
