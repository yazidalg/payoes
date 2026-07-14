import { paymentLinkCustomerInputSchema } from "@/lib/payment-links/schemas";
import {
  hasCustomerCollection,
  type PaymentLinkCustomerCollection,
  type PaymentLinkCustomerInput,
} from "@/lib/payment-links/types";

export function getPaymentLinkCustomerInputError(
  input: PaymentLinkCustomerInput | undefined,
  collection: PaymentLinkCustomerCollection | null | undefined,
): string | null {
  if (!collection || !hasCustomerCollection(collection)) {
    return null;
  }

  const parsed = paymentLinkCustomerInputSchema.safeParse(input ?? {});

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid customer details";
  }

  const data = parsed.data;

  if (collection.collect_customer_name && !data.customer_name?.trim()) {
    return "Customer name is required";
  }

  if (collection.collect_business_name && !data.business_name?.trim()) {
    return "Business name is required";
  }

  if (collection.require_phone_number && !data.phone_number?.trim()) {
    return "Phone number is required";
  }

  if (collection.collect_customer_address) {
    if (!data.address_line1?.trim()) {
      return "Address line 1 is required";
    }

    if (!data.address_city?.trim()) {
      return "City is required";
    }

    if (!data.address_country?.trim()) {
      return "Country is required";
    }
  }

  return null;
}
