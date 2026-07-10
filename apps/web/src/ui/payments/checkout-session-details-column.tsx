import Link from "next/link";
import type { CheckoutSessionRow } from "@/lib/payments/types";
import { formatAssetRef } from "@/lib/payments/types";
import {
  CalendarIcon,
  CopyText,
  StatusBadge,
  TimestampTooltip,
} from "@dub/ui";
import { CreditCard, Users } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import type { HTMLProps } from "react";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import {
  formatCheckoutSessionAmount,
  getCheckoutSessionStatusVariant,
} from "./payment-formatters";

export function CheckoutSessionDetailsColumn({
  session,
  isLoading = false,
}: {
  session?: CheckoutSessionRow;
  isLoading?: boolean;
}) {
  const basicFields = [
    session?.customer_id
      ? {
          id: "customer",
          icon: <Users className="size-3.5 shrink-0" />,
          text: (
            <Link
              href={`/dashboard/customers/${session.customer_id}`}
              className="min-w-0 truncate text-xs font-medium underline decoration-dotted underline-offset-2"
            >
              {session.customer_id}
            </Link>
          ),
        }
      : null,
    session?.payment_intent_id
      ? {
          id: "payment-intent",
          icon: <CreditCard className="size-3.5 shrink-0" />,
          text: (
            <Link
              href={`/dashboard/payments/${session.payment_intent_id}`}
              className="min-w-0 truncate text-xs font-medium underline decoration-dotted underline-offset-2"
            >
              {session.payment_intent_id}
            </Link>
          ),
        }
      : null,
    session?.created_at
      ? {
          id: "created",
          icon: <CalendarIcon className="size-3.5 shrink-0" />,
          text: (
            <span>
              Created{" "}
              <TimestampTooltip
                timestamp={session.created_at}
                rows={["local", "utc"]}
                side="left"
              >
                <span>
                  {new Date(session.created_at).toLocaleDateString("en-US", {
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
    session?.expires_at
      ? {
          id: "expires",
          icon: <CalendarIcon className="size-3.5 shrink-0" />,
          text: (
            <span>
              Expires{" "}
              <TimestampTooltip
                timestamp={session.expires_at}
                rows={["local", "utc"]}
                side="left"
              >
                <span>
                  {new Date(session.expires_at).toLocaleDateString("en-US", {
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
          <div className="bg-bg-subtle flex size-10 items-center justify-center rounded-full border border-neutral-100">
            <CreditCard className="size-4 text-neutral-600" />
          </div>

          <div className="mt-3">
            {session ? (
              <div className="flex flex-col items-start gap-1 text-left">
                <span className="text-content-emphasis text-base font-semibold">
                  {formatCheckoutSessionAmount(session)}
                </span>
                <CopyText
                  value={session.id}
                  className="block w-fit text-left font-mono text-xs text-neutral-500"
                >
                  {session.id}
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
          {session ? (
            <StatusBadge
              variant={getCheckoutSessionStatusVariant(session.status)}
              icon={null}
            >
              {session.status}
            </StatusBadge>
          ) : null}

          {isLoading && !session
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
          <DetailHeading>Settlement asset</DetailHeading>
          <div className="mt-2.5 text-xs text-neutral-600">
            {isLoading && !session ? (
              <SmoothSkeleton className="h-4 w-20" />
            ) : (
              <p>{formatAssetRef(session?.settlement_asset)}</p>
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
