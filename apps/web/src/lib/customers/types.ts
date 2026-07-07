export type CustomerRow = {
  id: string;
  email: string | null;
  name: string | null;
  primary_stellar_address: string | null;
  notes: string | null;
  created_at: string;
};

export type CustomerPaymentRow = {
  id: string;
  amount: string;
  asset: string;
  status: string;
  payer_address: string | null;
  created_at: string;
};

export type CustomerDetail = {
  customer: CustomerRow;
  payments: CustomerPaymentRow[];
};

export function formatCustomerLabel(customer: {
  id: string;
  name: string | null;
  email: string | null;
  primary_stellar_address: string | null;
}) {
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
