"use client";

import { OrganizationMark } from "@/components/organizations/organization-mark";
import { PaymentLinkOrderSummary } from "@/components/payment-links/payment-link-order-summary";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PaymentLinkCustomerCollection,
  PaymentLinkLineItem,
} from "@/lib/payment-links/types";
import { cn } from "@/lib/utils";

export type PaymentLinkPageContentProps = {
  organization: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  };
  environment: "sandbox" | "production";
  currencyCode: string;
  amount: string;
  items: PaymentLinkLineItem[];
  description: string | null;
  customerCollection: PaymentLinkCustomerCollection;
  preview?: boolean;
  isSubmitting?: boolean;
  onContinue?: () => void;
};

function PreviewField({
  label,
  required = false,
  placeholder,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input placeholder={placeholder} disabled />
    </div>
  );
}

export function PaymentLinkPageContent({
  organization,
  environment,
  currencyCode,
  amount,
  items,
  description,
  customerCollection,
  preview = false,
  isSubmitting = false,
  onContinue,
}: PaymentLinkPageContentProps) {
  const displayItems =
    items.length > 0
      ? items
      : [
          {
            description: "Product",
            quantity: "1",
            unit_amount: amount || "0",
            line_amount: amount || "0",
          },
        ];

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <OrganizationMark organization={organization} className="size-10" />
          <div>
            <p className="font-medium">{organization.name}</p>
            <p className="text-sm text-muted-foreground">Secure Stellar checkout</p>
          </div>
        </div>
        <EnvironmentBadge environment={environment} />
      </div>

      <div className="mt-6 space-y-4">
        <PaymentLinkOrderSummary
          items={displayItems}
          amount={amount || "0"}
          currencyCode={currencyCode}
        />

        {description?.trim() ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}

        {customerCollection.collect_customer_name ? (
          <PreviewField label="Full name" required placeholder="Jane Customer" />
        ) : null}

        {customerCollection.collect_business_name ? (
          <PreviewField label="Business name" required placeholder="Acme Corp" />
        ) : null}

        {customerCollection.require_phone_number ? (
          <PreviewField label="Phone number" required placeholder="+1 555 0100" />
        ) : null}

        {customerCollection.collect_customer_address ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Billing address</p>
            <PreviewField label="Address line 1" required placeholder="123 Main St" />
            <PreviewField label="Address line 2" placeholder="Suite 4" />
            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewField label="City" required placeholder="San Francisco" />
              <PreviewField label="State / Province" placeholder="CA" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewField label="Postal code" placeholder="94105" />
              <PreviewField label="Country" required placeholder="United States" />
            </div>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        className={cn("mt-6 w-full", preview && "pointer-events-none")}
        disabled={preview || isSubmitting}
        isLoading={isSubmitting}
        onClick={onContinue}
      >
        Continue to checkout
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {preview
          ? "Customers review the order here, then pay on the hosted checkout page."
          : "You will connect your wallet and pay on the checkout page."}
      </p>
    </div>
  );
}
