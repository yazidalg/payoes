"use client";

import { useState } from "react";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { PaymentLinkOrderSummary } from "@/components/payment-links/payment-link-order-summary";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PaymentLinkCustomerCollection,
  PaymentLinkCustomerInput,
  PaymentLinkLineItem,
} from "@/lib/payment-links/types";

type PaymentLinkHostedFormProps = {
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
  isSubmitting?: boolean;
  onSubmit: (customer: PaymentLinkCustomerInput) => void;
};

export function PaymentLinkHostedForm({
  organization,
  environment,
  currencyCode,
  amount,
  items,
  description,
  customerCollection,
  isSubmitting = false,
  onSubmit,
}: PaymentLinkHostedFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);

    if (customerCollection.collect_customer_name && !customerName.trim()) {
      setError("Customer name is required");
      return;
    }

    if (customerCollection.collect_business_name && !businessName.trim()) {
      setError("Business name is required");
      return;
    }

    if (customerCollection.require_phone_number && !phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }

    if (customerCollection.collect_customer_address) {
      if (!addressLine1.trim()) {
        setError("Address line 1 is required");
        return;
      }

      if (!addressCity.trim()) {
        setError("City is required");
        return;
      }

      if (!addressCountry.trim()) {
        setError("Country is required");
        return;
      }
    }

    onSubmit({
      customer_name: customerName,
      business_name: businessName,
      phone_number: phoneNumber,
      address_line1: addressLine1,
      address_line2: addressLine2,
      address_city: addressCity,
      address_state: addressState,
      address_postal_code: addressPostalCode,
      address_country: addressCountry,
    });
  }

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm">
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
          items={items}
          amount={amount}
          currencyCode={currencyCode}
        />

        {description?.trim() ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}

        {customerCollection.collect_customer_name ? (
          <div className="space-y-2">
            <Label htmlFor="customer-name">
              Full name<span className="text-destructive"> *</span>
            </Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Jane Customer"
            />
          </div>
        ) : null}

        {customerCollection.collect_business_name ? (
          <div className="space-y-2">
            <Label htmlFor="business-name">
              Business name<span className="text-destructive"> *</span>
            </Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Acme Corp"
            />
          </div>
        ) : null}

        {customerCollection.require_phone_number ? (
          <div className="space-y-2">
            <Label htmlFor="phone-number">
              Phone number<span className="text-destructive"> *</span>
            </Label>
            <Input
              id="phone-number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+1 555 0100"
            />
          </div>
        ) : null}

        {customerCollection.collect_customer_address ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Billing address</p>
            <div className="space-y-2">
              <Label htmlFor="address-line-1">
                Address line 1<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="address-line-1"
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-line-2">Address line 2</Label>
              <Input
                id="address-line-2"
                value={addressLine2}
                onChange={(event) => setAddressLine2(event.target.value)}
                placeholder="Suite 4"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address-city">
                  City<span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="address-city"
                  value={addressCity}
                  onChange={(event) => setAddressCity(event.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-state">State / Province</Label>
                <Input
                  id="address-state"
                  value={addressState}
                  onChange={(event) => setAddressState(event.target.value)}
                  placeholder="CA"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address-postal">Postal code</Label>
                <Input
                  id="address-postal"
                  value={addressPostalCode}
                  onChange={(event) => setAddressPostalCode(event.target.value)}
                  placeholder="94105"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-country">
                  Country<span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="address-country"
                  value={addressCountry}
                  onChange={(event) => setAddressCountry(event.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        className="mt-6 w-full"
        isLoading={isSubmitting}
        onClick={handleSubmit}
      >
        Continue to checkout
      </Button>
    </div>
  );
}
