import { formatAmountWithAsset } from "@/lib/format/amount";

export type AllowedAssetRef = {
  asset_code: string;
  issuer_address: string | null;
};

export type PaymentRow = {
  id: string;
  object?: string;
  amount: string;
  pricing_currency?: string | null;
  pricing_amount?: string | null;
  quoted_paid_amount?: string | null;
  received_amount?: string | null;
  quoted_settlement_amount?: string | null;
  platform_fee_amount?: string | null;
  merchant_settlement_amount?: string | null;
  quote_rate?: string | null;
  settlement_quote_rate?: string | null;
  quote_expires_at?: string | null;
  settlement_asset: AllowedAssetRef;
  allowed_assets: AllowedAssetRef[];
  paid_asset: AllowedAssetRef | null;
  status: string;
  description: string | null;
  checkout_url: string;
  source_type?: string;
  customer_id: string | null;
  payer_address: string | null;
  tx_hash: string | null;
  confirmed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type SettlementConversionRow = {
  payment_id: string;
  invoice_id: string | null;
  paid_asset: AllowedAssetRef | null;
  quoted_paid_amount: string;
  settlement_asset: AllowedAssetRef;
  quoted_settlement_amount: string;
  platform_fee_amount?: string | null;
  merchant_settlement_amount?: string | null;
  pricing_amount: string | null;
  pricing_currency: string | null;
  quote_rate: string | null;
  settlement_quote_rate: string | null;
  tx_hash: string | null;
  confirmed_at: string | null;
  converted_on_chain: boolean;
};

export type CheckoutSessionRow = {
  id: string;
  object: string;
  status: string;
  payment_intent_id: string | null;
  amount: string | null;
  settlement_asset: AllowedAssetRef | null;
  allowed_assets: AllowedAssetRef[];
  paid_asset: AllowedAssetRef | null;
  payment_status: string | null;
  customer_id: string | null;
  success_url: string | null;
  cancel_url: string | null;
  checkout_url: string;
  expires_at: string | null;
  created_at: string;
};

export type PaymentLinkRow = {
  id: string;
  object: string;
  amount: string;
  currency_code: string | null;
  settlement_asset: AllowedAssetRef;
  allowed_assets: AllowedAssetRef[];
  product_name: string | null;
  product_description: string | null;
  items?: PaymentLinkLineItemRow[];
  description: string | null;
  customer_collection: {
    collect_customer_name: boolean;
    collect_business_name: boolean;
    collect_customer_address: boolean;
    require_phone_number: boolean;
  };
  active: boolean;
  item_count?: number;
  metadata: Record<string, string> | null;
  url: string;
  environment: string;
  created_at: string;
  updated_at: string;
};

export type PaymentLinkLineItemRow = {
  description: string;
  quantity: string;
  unit_amount: string;
  line_amount: string;
};

export type InvoiceLineItemRow = {
  description: string;
  quantity: string;
  unit_amount: string;
};

export type InvoiceActivityRow = {
  id: string;
  label: string;
  at: string;
};

export type InvoiceRow = {
  id: string;
  object: string;
  invoice_number: string;
  status: string;
  display_status?: string;
  amount: string;
  currency_code: string;
  settlement_asset: AllowedAssetRef | null;
  allowed_assets: AllowedAssetRef[];
  description: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  checkout_session_id: string | null;
  checkout_url: string | null;
  items: InvoiceLineItemRow[];
  activity: InvoiceActivityRow[];
  due_at: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerOption = {
  id: string;
  name: string | null;
  email: string | null;
  primary_stellar_address: string | null;
};

export function customerLabel(customer: CustomerOption) {
  if (customer.name) {
    return customer.name;
  }

  if (customer.email) {
    return customer.email;
  }

  if (customer.primary_stellar_address) {
    return `${customer.primary_stellar_address.slice(0, 8)}...`;
  }

  return customer.id;
}

export function formatAssetRef(asset: AllowedAssetRef | null | undefined) {
  return asset?.asset_code ?? "—";
}

export function formatAssetAmount(
  amount: string | number | null | undefined,
  asset: AllowedAssetRef | null | undefined
) {
  return formatAmountWithAsset(amount, asset);
}
