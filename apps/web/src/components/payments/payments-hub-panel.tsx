"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreatePaymentMenu } from "@/components/payments/create-payment-menu";
import { InvoicesListPanel } from "@/components/payments/invoices-list-panel";
import { PaymentLinksListPanel } from "@/components/payments/payment-links-list-panel";
import { PaymentsListPanel } from "@/components/payments/payments-list-panel";
import { SubscriptionsListPanel } from "@/components/payments/subscriptions-list-panel";
import { Button } from "@/components/ui/button";
import {
  PAYMENTS_TAB_LABELS,
  PAYMENTS_TABS,
  getPaymentsHubHref,
  parsePaymentsTab,
  type PaymentsTab,
} from "@/lib/navigation/payments-tabs";
import { cn } from "@/lib/utils";

export function PaymentsHubPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parsePaymentsTab(searchParams.get("tab"));
  const [reloadKey, setReloadKey] = useState(0);

  const setTab = useCallback(
    (tab: PaymentsTab) => {
      router.replace(getPaymentsHubHref(tab));
    },
    [router]
  );

  function handleCreated(tab: PaymentsTab) {
    setReloadKey((current) => current + 1);
    setTab(tab);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage payment intents, invoices, links, and subscriptions.
          </p>
        </div>
        <CreatePaymentMenu organizationId={organizationId} onCreated={handleCreated} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {PAYMENTS_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTab(tab)}
            className={cn(
              "rounded-lg",
              activeTab === tab && "bg-muted font-medium text-foreground"
            )}
          >
            {PAYMENTS_TAB_LABELS[tab]}
          </Button>
        ))}
      </div>

      {activeTab === "payment-intents" ? (
        <PaymentsListPanel
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

      {activeTab === "subscriptions" ? (
        <SubscriptionsListPanel
          organizationId={organizationId}
          embedded
          reloadKey={reloadKey}
        />
      ) : null}
    </div>
  );
}
