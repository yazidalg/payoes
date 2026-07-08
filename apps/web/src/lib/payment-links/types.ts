export type PaymentLinkCustomerCollection = {
  collect_customer_name: boolean;
  collect_business_name: boolean;
  collect_customer_address: boolean;
  require_phone_number: boolean;
};

export const DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION: PaymentLinkCustomerCollection =
  {
    collect_customer_name: false,
    collect_business_name: false,
    collect_customer_address: false,
    require_phone_number: false,
  };

export type PaymentLinkCustomerInput = {
  customer_name?: string | null;
  business_name?: string | null;
  phone_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
};

export type PaymentLinkLineItem = {
  description: string;
  quantity: string;
  unit_amount: string;
  line_amount: string;
};

export type PaymentLinkPresentation = {
  currencyCode: string;
  amount: string;
  items: PaymentLinkLineItem[];
  description: string | null;
  customerCollection: PaymentLinkCustomerCollection;
  environmentLabel: string;
  organization: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  };
};

export function hasCustomerCollection(
  collection: PaymentLinkCustomerCollection | null | undefined
) {
  const flags = collection ?? DEFAULT_PAYMENT_LINK_CUSTOMER_COLLECTION;

  return (
    flags.collect_customer_name ||
    flags.collect_business_name ||
    flags.collect_customer_address ||
    flags.require_phone_number
  );
}

export function normalizePaymentLinkCustomerCollection(
  value: PaymentLinkCustomerCollection | null | undefined
): PaymentLinkCustomerCollection {
  return {
    collect_customer_name: Boolean(value?.collect_customer_name),
    collect_business_name: Boolean(value?.collect_business_name),
    collect_customer_address: Boolean(value?.collect_customer_address),
    require_phone_number: Boolean(value?.require_phone_number),
  };
}
