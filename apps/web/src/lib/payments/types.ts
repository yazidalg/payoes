export type PaymentRow = {
  id: string;
  object?: string;
  amount: string;
  asset: string;
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

export type CheckoutSessionRow = {
  id: string;
  object: string;
  status: string;
  payment_intent_id: string | null;
  amount: string | null;
  asset: string | null;
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
  asset: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string> | null;
  url: string;
  environment: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  object: string;
  status: string;
  amount: string;
  asset: string;
  description: string | null;
  customer_id: string | null;
  subscription_id: string | null;
  checkout_session_id: string | null;
  checkout_url: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  object: string;
  status: string;
  amount: string;
  asset: string;
  description: string | null;
  customer_id: string | null;
  interval: string;
  interval_count: number;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
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
