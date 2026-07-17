"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { PaymentRow } from "@/lib/payments/types";
import { PaymentAmountsSection } from "@/ui/payments/payment-amounts-section";
import { PaymentDetailSkeleton } from "@/ui/payments/payment-detail-skeleton";
import { PaymentDetailStats } from "@/ui/payments/payment-detail-stats";
import { PaymentDetailsColumn } from "@/ui/payments/payment-details-column";
import {
  formatPaidAmount,
  getPaymentStatusVariant,
} from "@/ui/payments/payment-formatters";
import { ShareLinkSection } from "@/ui/payments/share-link-section";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import {
  Button,
  MenuItem,
  Popover,
  StatusBadge,
  useCopyToClipboard,
} from "@dub/ui";
import { ChevronRight, Copy, CreditCard, Dots, Link4 } from "@dub/ui/icons";
import { Command } from "cmdk";
import { toast } from "sonner";

export function PaymentDetailPanel({
  organizationId,
  paymentId,
}: {
  organizationId: string;
  paymentId: string;
}) {
  const { activeOrganization } = useDashboardShell();
  const fetchPayment = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/payments/${paymentId}`,
    );
    const data = (await response.json()) as PaymentRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Payment not found");
    }

    return data;
  }, [organizationId, paymentId]);

  const { data: payment, error, isLoading } = useAsyncData(fetchPayment, [
    organizationId,
    paymentId,
  ]);

  const headerOverride = useMemo(() => {
    if (!payment) {
      return null;
    }

    return {
      title: (
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={getPaymentsHubHref("payment-intents")}
            aria-label="Back to payments"
            title="Back to payments"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <CreditCard className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-base font-semibold">
            {formatPaidAmount(payment)}
          </span>
          <StatusBadge
            variant={getPaymentStatusVariant(payment.status)}
            icon={null}
          >
            {payment.status}
          </StatusBadge>
        </div>
      ),
      controls: <PaymentDetailMenu payment={payment} />,
    };
  }, [payment]);

  useSetDashboardPageHeader(headerOverride);

  if (isLoading) {
    return <PaymentDetailSkeleton />;
  }

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <Link
          href={getPaymentsHubHref("payment-intents")}
          className="bg-bg-subtle hover:bg-bg-emphasis inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        >
          <CreditCard className="size-4" />
        </Link>
        <AlertBlock type="error">{error ?? "Payment not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PaymentDetailStats payment={payment} />

      <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
        <div className="@3xl/page:order-2">
          <PaymentDetailsColumn
            payment={payment}
            environment={activeOrganization.environment}
          />
        </div>

        <div className="@3xl/page:order-1 space-y-6">
          <PaymentAmountsSection
            payment={payment}
            environment={activeOrganization.environment}
          />

          {payment.checkout_url && payment.status === "pending" ? (
            <ShareLinkSection
              title="Checkout"
              description="Share this link with your customer."
              url={payment.checkout_url}
              copyLabel="Copy checkout link"
              copySuccessMessage="Checkout link copied"
              openLabel="Open checkout"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaymentDetailMenu({ payment }: { payment: PaymentRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(payment.id), {
                  success: "Copied payment ID",
                });
                setIsOpen(false);
              }}
            >
              Copy payment ID
            </MenuItem>
            {payment.checkout_url && payment.status === "pending" ? (
              <MenuItem
                as={Command.Item}
                icon={Link4}
                onSelect={() => {
                  toast.promise(copyToClipboard(payment.checkout_url), {
                    success: "Checkout link copied",
                  });
                  setIsOpen(false);
                }}
              >
                Copy checkout link
              </MenuItem>
            ) : null}
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-9 whitespace-nowrap px-2"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}
