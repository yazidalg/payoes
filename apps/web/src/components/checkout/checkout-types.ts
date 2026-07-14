import type { CheckoutLineItem } from "@/lib/checkout/line-items";
import type { CheckoutInvoiceDetails } from "@/lib/checkout/invoice-details";
import type { PaymentLinkCustomerCollection } from "@/lib/payment-links/types";
import type { Organization } from "@/lib/db/schema";

export type AllowedAsset = {
  asset_code: string;
  issuer_address: string | null;
};

export type PaymentQuote = {
  pricing_amount: string;
  pricing_currency: string;
  paid_asset: AllowedAsset;
  paid_amount: string;
  settlement_asset?: AllowedAsset;
  settlement_amount?: string;
  rate: string;
  settlement_quote_rate?: string;
  requires_path_payment?: boolean;
  expires_at: string;
};

export type CheckoutData = {
  payment: {
    id: string;
    amount: string;
    settlement_asset: AllowedAsset;
    allowed_assets: AllowedAsset[];
    paid_asset: AllowedAsset | null;
    status: string;
    session_error?: string | null;
    last_attempt_error?: string | null;
    description: string | null;
    environment: Organization["environment"];
    expires_at: string | null;
    quote_expires_at: string | null;
    pricing_currency: string | null;
    pricing_amount: string | null;
    quoted_paid_amount: string | null;
    quoted_settlement_amount: string | null;
    quote_rate: string | null;
    settlement_quote_rate: string | null;
    source_type: string | null;
    receiving_address: string;
    deposit_address: string | null;
    memo: string | null;
    payment_flow: "direct" | "soroban" | "escrow";
  };
  items: CheckoutLineItem[];
  merchant: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  } | null;
  invoice?: CheckoutInvoiceDetails | null;
  customer_collection?: PaymentLinkCustomerCollection | null;
};
