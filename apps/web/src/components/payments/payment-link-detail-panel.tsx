"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertBlock } from "@/components/shared/alert-block";
import { useAsyncData } from "@/hooks/use-async-data";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";
import type { PaymentLinkRow } from "@/lib/payments/types";
import { PaymentLinkDetailSkeleton } from "@/ui/payments/payment-link-detail-skeleton";
import { PaymentLinkDetailStats } from "@/ui/payments/payment-link-detail-stats";
import { PaymentLinkDetailsColumn } from "@/ui/payments/payment-link-details-column";
import {
  formatPaymentLinkAmount,
  getPaymentLinkStatusVariant,
} from "@/ui/payments/payment-formatters";
import {
  PaymentLinkCustomerCollectionSection,
  PaymentLinkMetadataSection,
  PaymentLinkProductsSection,
} from "@/ui/payments/payment-link-sections";
import { ShareLinkSection } from "@/ui/payments/share-link-section";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import {
  Button,
  MenuItem,
  Popover,
  StatusBadge,
  useCopyToClipboard,
} from "@dub/ui";
import { ChevronRight, Copy, Dots, Hyperlink, Link4 } from "@dub/ui/icons";
import { Command } from "cmdk";
import { toast } from "sonner";

export function PaymentLinkDetailPanel({
  organizationId,
  linkId,
}: {
  organizationId: string;
  linkId: string;
}) {
  const fetchLink = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-links/${linkId}`,
    );
    const data = (await response.json()) as PaymentLinkRow & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Payment link not found");
    }

    return data;
  }, [organizationId, linkId]);

  const { data: link, error, isLoading } = useAsyncData(fetchLink, [
    organizationId,
    linkId,
  ]);

  const headerTitle = link?.product_name ?? (link ? formatPaymentLinkAmount(link) : "");

  const headerOverride = useMemo(() => {
    if (!link) {
      return null;
    }

    return {
      title: (
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={getPaymentsHubHref("payment-links")}
            aria-label="Back to payment links"
            title="Back to payment links"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <Hyperlink className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-base font-semibold">
            {headerTitle}
          </span>
          <StatusBadge variant={getPaymentLinkStatusVariant(link.active)} icon={null}>
            {link.active ? "Active" : "Inactive"}
          </StatusBadge>
        </div>
      ),
      controls: <PaymentLinkDetailMenu link={link} />,
    };
  }, [headerTitle, link]);

  useSetDashboardPageHeader(headerOverride);

  if (isLoading) {
    return <PaymentLinkDetailSkeleton />;
  }

  if (error || !link) {
    return (
      <div className="space-y-4">
        <Link
          href={getPaymentsHubHref("payment-links")}
          className="bg-bg-subtle hover:bg-bg-emphasis inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        >
          <Hyperlink className="size-4" />
        </Link>
        <AlertBlock type="error">{error ?? "Payment link not found"}</AlertBlock>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PaymentLinkDetailStats link={link} />

      <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
        <div className="@3xl/page:order-2">
          <PaymentLinkDetailsColumn link={link} />
        </div>

        <div className="@3xl/page:order-1 space-y-6">
          <PaymentLinkProductsSection link={link} />
          <PaymentLinkMetadataSection link={link} />
          <PaymentLinkCustomerCollectionSection link={link} />

          <ShareLinkSection
            title="Checkout link"
            description="Each visit starts a new checkout session."
            url={link.url}
            copyLabel="Copy checkout link"
            copySuccessMessage="Checkout link copied"
            openLabel="Open checkout"
          />
        </div>
      </div>
    </div>
  );
}

function PaymentLinkDetailMenu({ link }: { link: PaymentLinkRow }) {
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
                toast.promise(copyToClipboard(link.id), {
                  success: "Copied link ID",
                });
                setIsOpen(false);
              }}
            >
              Copy link ID
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Link4}
              onSelect={() => {
                toast.promise(copyToClipboard(link.url), {
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
