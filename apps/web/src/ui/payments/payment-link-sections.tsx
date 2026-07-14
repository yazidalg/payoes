import type { PaymentLinkRow } from "@/lib/payments/types";
import { formatAmountWithUnit } from "@/lib/format/amount";
import { DetailField } from "@/ui/shared/detail-field";
import { DetailSection } from "@/ui/shared/detail-section";

export function PaymentLinkProductsSection({ link }: { link: PaymentLinkRow }) {
  if (!link.items || link.items.length === 0) {
    return null;
  }

  return (
    <DetailSection
      title="Products"
      description="Line items shown on checkout."
      contentClassName="p-0"
    >
      <div className="divide-y divide-neutral-200">
        {link.items.map((item, index) => (
          <div
            key={`${item.description}-${index}`}
            className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="text-content-emphasis font-medium">{item.description}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {item.quantity} x{" "}
                {link.currency_code
                  ? formatAmountWithUnit(item.unit_amount, link.currency_code)
                  : item.unit_amount}
              </p>
            </div>
            <p className="shrink-0 font-medium">
              {link.currency_code
                ? formatAmountWithUnit(item.line_amount, link.currency_code)
                : item.line_amount}
            </p>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}

export function PaymentLinkCustomerCollectionSection({
  link,
}: {
  link: PaymentLinkRow;
}) {
  const collection = link.customer_collection;

  return (
    <DetailSection
      title="Customer collection"
      description="Fields requested before checkout."
      contentClassName="p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailField label="Customer name">
          {collection.collect_customer_name ? "Collected" : "Not collected"}
        </DetailField>
        <DetailField label="Business name">
          {collection.collect_business_name ? "Collected" : "Not collected"}
        </DetailField>
        <DetailField label="Billing address">
          {collection.collect_customer_address ? "Collected" : "Not collected"}
        </DetailField>
        <DetailField label="Phone number">
          {collection.require_phone_number ? "Required" : "Not required"}
        </DetailField>
      </div>
    </DetailSection>
  );
}

export function PaymentLinkMetadataSection({ link }: { link: PaymentLinkRow }) {
  if (!link.description && !link.product_description) {
    return null;
  }

  return (
    <DetailSection
      title="Details"
      description="Description and product metadata."
      contentClassName="p-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {link.description ? (
          <DetailField label="Description">{link.description}</DetailField>
        ) : null}
        {link.product_description ? (
          <DetailField label="Product description">
            {link.product_description}
          </DetailField>
        ) : null}
      </div>
    </DetailSection>
  );
}
