"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutSessionsListPanel } from "@/components/payments/checkout-sessions-list-panel";
import { CreatePaymentMenu } from "@/components/payments/create-payment-menu";
import { InvoicesListPanel } from "@/components/payments/invoices-list-panel";
import { PaymentLinksListPanel } from "@/components/payments/payment-links-list-panel";
import { PaymentsListPanel } from "@/components/payments/payments-list-panel";
import { parsePaymentsTab } from "@/lib/navigation/payments-tabs";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { PaymentsTabs } from "@/ui/payments/payments-tabs";

export function PaymentsHubPanel({ organizationId }: { organizationId: string }) {
  const searchParams = useSearchParams();
  const activeTab = parsePaymentsTab(searchParams.get("tab"));
  const [reloadKey, setReloadKey] = useState(0);

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Create and manage payment intents, checkout sessions, invoices, and payment links.",
        href: "/dashboard/developers/documentation",
      },
      controls: (
        <CreatePaymentMenu
          organizationId={organizationId}
          includeCheckoutSession
          onCreated={() => setReloadKey((current) => current + 1)}
        />
      ),
    }),
    [organizationId],
  );

  useSetDashboardPageHeader(headerOverride);

  return (
    <div className="flex flex-col gap-4">
      <PaymentsTabs
        organizationId={organizationId}
        activeTab={activeTab}
        reloadKey={reloadKey}
      />

      <div key={activeTab}>
        {activeTab === "payment-intents" ? (
          <PaymentsListPanel
            organizationId={organizationId}
            embedded
            reloadKey={reloadKey}
          />
        ) : null}

        {activeTab === "checkout-sessions" ? (
          <CheckoutSessionsListPanel
            organizationId={organizationId}
            embedded
            reloadKey={reloadKey}
          />
        ) : null}

        {activeTab === "invoices" ? (
          <InvoicesListPanel
            organizationId={organizationId}
            embedded
            reloadKey={reloadKey}
          />
        ) : null}

        {activeTab === "payment-links" ? (
          <PaymentLinksListPanel
            organizationId={organizationId}
            embedded
            reloadKey={reloadKey}
          />
        ) : null}
      </div>
    </div>
  );
}
