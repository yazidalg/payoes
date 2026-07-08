"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentLinkHostedForm } from "@/components/payment-links/payment-link-hosted-form";
import { PaymentLinkPageContent } from "@/components/payment-links/payment-link-page-content";
import { AlertBlock } from "@/components/shared/alert-block";
import type {
  PaymentLinkCustomerCollection,
  PaymentLinkLineItem,
} from "@/lib/payment-links/types";

type PublicPaymentLink = {
  id: string;
  amount: string;
  currency_code: string | null;
  items: PaymentLinkLineItem[];
  description: string | null;
  customer_collection: PaymentLinkCustomerCollection;
  requires_customer_details: boolean;
  environment: "sandbox" | "production";
  settlement_asset: {
    asset_code: string;
    issuer_address: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  };
};

export function PaymentLinkHostedClient({ link }: { link: PublicPaymentLink }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencyCode = link.currency_code ?? link.settlement_asset.asset_code;

  async function startCheckout(customer?: Record<string, string | null | undefined>) {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/payment-links/${link.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer }),
    });

    const data = (await response.json()) as {
      checkout_url?: string;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !data.checkout_url) {
      setError(data.error ?? "Unable to start checkout");
      return;
    }

    router.push(data.checkout_url);
  }

  if (link.requires_customer_details) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md space-y-4">
          {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
          <PaymentLinkHostedForm
            organization={link.organization}
            environment={link.environment}
            currencyCode={currencyCode}
            amount={link.amount}
            items={link.items}
            description={link.description}
            customerCollection={link.customer_collection}
            isSubmitting={isSubmitting}
            onSubmit={(customer) => void startCheckout(customer)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-4">
        {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
        <PaymentLinkPageContent
          organization={link.organization}
          environment={link.environment}
          currencyCode={currencyCode}
          amount={link.amount}
          items={link.items}
          description={link.description}
          customerCollection={link.customer_collection}
          isSubmitting={isSubmitting}
          onContinue={() => void startCheckout()}
        />
      </div>
    </div>
  );
}
