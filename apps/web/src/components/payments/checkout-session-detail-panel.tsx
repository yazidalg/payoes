"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { CheckoutSessionRow } from "@/lib/payments/types";
import { CheckoutSessionDetailSkeleton } from "@/ui/payments/checkout-session-detail-skeleton";
import { CheckoutSessionDetailStats } from "@/ui/payments/checkout-session-detail-stats";
import { CheckoutSessionDetailsColumn } from "@/ui/payments/checkout-session-details-column";
import { CheckoutSessionDetailsSection } from "@/ui/payments/checkout-session-details-section";
import {
  formatCheckoutSessionAmount,
  getCheckoutSessionStatusVariant,
} from "@/ui/payments/payment-formatters";
import { ShareLinkSection } from "@/ui/payments/share-link-section";
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

export function CheckoutSessionDetailPanel({
  organizationId,
  sessionId,
}: {
  organizationId: string;
  sessionId: string;
}) {
  const fetchSession = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions/${sessionId}`,
    );
    const data = (await response.json()) as CheckoutSessionRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Checkout session not found");
    }

    return data;
  }, [organizationId, sessionId]);

  const { data: session, error, isLoading } = useAsyncData(fetchSession, [
    organizationId,
    sessionId,
  ]);

  const headerOverride = useMemo(() => {
    if (!session) {
      return null;
    }

    return {
      title: (
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={getPaymentsHubHref("checkout-sessions")}
            aria-label="Back to checkout sessions"
            title="Back to checkout sessions"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <CreditCard className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-base font-semibold">
            {formatCheckoutSessionAmount(session)}
          </span>
          <StatusBadge
            variant={getCheckoutSessionStatusVariant(session.status)}
            icon={null}
          >
            {session.status}
          </StatusBadge>
        </div>
      ),
      controls: <CheckoutSessionDetailMenu session={session} />,
    };
  }, [session]);

  useSetDashboardPageHeader(headerOverride);

  if (isLoading) {
    return <CheckoutSessionDetailSkeleton />;
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <Link
          href={getPaymentsHubHref("checkout-sessions")}
          className="bg-bg-subtle hover:bg-bg-emphasis inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        >
          <CreditCard className="size-4" />
        </Link>
        <AlertBlock type="error">{error ?? "Checkout session not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <CheckoutSessionDetailStats session={session} />

      <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
        <div className="@3xl/page:order-2">
          <CheckoutSessionDetailsColumn session={session} />
        </div>

        <div className="@3xl/page:order-1 space-y-6">
          <CheckoutSessionDetailsSection session={session} />

          <ShareLinkSection
            title="Checkout"
            description="Share this link with your customer."
            url={session.checkout_url}
            copyLabel="Copy checkout link"
            copySuccessMessage="Checkout link copied"
          >
            <Button
              type="button"
              variant="outline"
              text="Open checkout"
              className="h-9"
              render={
                <a href={session.checkout_url} target="_blank" rel="noreferrer" />
              }
            />
          </ShareLinkSection>
        </div>
      </div>
    </div>
  );
}

function CheckoutSessionDetailMenu({ session }: { session: CheckoutSessionRow }) {
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
                toast.promise(copyToClipboard(session.id), {
                  success: "Copied session ID",
                });
                setIsOpen(false);
              }}
            >
              Copy session ID
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Link4}
              onSelect={() => {
                toast.promise(copyToClipboard(session.checkout_url), {
                  success: "Checkout link copied",
                });
                setIsOpen(false);
              }}
            >
              Copy checkout link
            </MenuItem>
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
