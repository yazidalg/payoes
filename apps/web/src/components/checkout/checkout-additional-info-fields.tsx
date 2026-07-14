"use client";

import type {
  PaymentLinkCustomerCollection,
  PaymentLinkCustomerInput,
} from "@/lib/payment-links/types";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormInput } from "@/ui/forms/form-input";
import { cn } from "@dub/utils";

type CheckoutAdditionalInfoFieldsProps = {
  collection: PaymentLinkCustomerCollection;
  value: PaymentLinkCustomerInput;
  onChange?: (value: PaymentLinkCustomerInput) => void;
  readOnly?: boolean;
  size?: "default" | "preview";
};

function updateField(
  value: PaymentLinkCustomerInput,
  field: keyof PaymentLinkCustomerInput,
  next: string,
  onChange?: (value: PaymentLinkCustomerInput) => void,
) {
  onChange?.({
    ...value,
    [field]: next,
  });
}

export function CheckoutAdditionalInfoFields({
  collection,
  value,
  onChange,
  readOnly = false,
  size = "default",
}: CheckoutAdditionalInfoFieldsProps) {
  const isPreview = size === "preview";
  const sectionGap = isPreview ? "space-y-2" : "space-y-4";
  const fieldGap = isPreview ? "space-y-0.5" : "space-y-1.5";
  const inputClassName = isPreview ? "h-8 px-2.5 text-xs" : "h-10 text-sm";
  const labelClassName = isPreview ? "text-[11px] text-neutral-600" : "text-sm";
  const headingClass = isPreview ? "text-xs font-medium" : "text-sm font-medium";

  return (
    <div className={sectionGap}>
      <div>
        <p className={cn("text-neutral-900", headingClass)}>Your details</p>
        {!isPreview ? (
          <p className="mt-0.5 text-xs text-neutral-500">
            Fill in your details before paying.
          </p>
        ) : null}
      </div>

      {collection.collect_customer_name ? (
        <div className={fieldGap}>
          <FormFieldLabel
            htmlFor="checkout-customer-name"
            required
            className={labelClassName}
          >
            Full name
          </FormFieldLabel>
          <FormInput
            id="checkout-customer-name"
            className={inputClassName}
            value={value.customer_name ?? ""}
            placeholder="Jane Customer"
            readOnly={readOnly}
            onChange={(event) =>
              updateField(value, "customer_name", event.target.value, onChange)
            }
          />
        </div>
      ) : null}

      {collection.collect_business_name ? (
        <div className={fieldGap}>
          <FormFieldLabel
            htmlFor="checkout-business-name"
            required
            className={labelClassName}
          >
            Business name
          </FormFieldLabel>
          <FormInput
            id="checkout-business-name"
            className={inputClassName}
            value={value.business_name ?? ""}
            placeholder="Acme Corp"
            readOnly={readOnly}
            onChange={(event) =>
              updateField(value, "business_name", event.target.value, onChange)
            }
          />
        </div>
      ) : null}

      {collection.require_phone_number ? (
        <div className={fieldGap}>
          <FormFieldLabel
            htmlFor="checkout-phone-number"
            required
            className={labelClassName}
          >
            Phone number
          </FormFieldLabel>
          <FormInput
            id="checkout-phone-number"
            className={inputClassName}
            value={value.phone_number ?? ""}
            placeholder="+1 555 0100"
            readOnly={readOnly}
            onChange={(event) =>
              updateField(value, "phone_number", event.target.value, onChange)
            }
          />
        </div>
      ) : null}

      {collection.collect_customer_address ? (
        <div className={cn(sectionGap, "pt-0.5")}>
          <p className={cn("text-neutral-900", headingClass)}>Billing address</p>

          <div className={fieldGap}>
            <FormFieldLabel
              htmlFor="checkout-address-line-1"
              required
              className={labelClassName}
            >
              Address line 1
            </FormFieldLabel>
            <FormInput
              id="checkout-address-line-1"
              className={inputClassName}
              value={value.address_line1 ?? ""}
              placeholder="123 Main St"
              readOnly={readOnly}
              onChange={(event) =>
                updateField(value, "address_line1", event.target.value, onChange)
              }
            />
          </div>

          <div className={fieldGap}>
            <FormFieldLabel
              htmlFor="checkout-address-line-2"
              className={labelClassName}
            >
              Address line 2
            </FormFieldLabel>
            <FormInput
              id="checkout-address-line-2"
              className={inputClassName}
              value={value.address_line2 ?? ""}
              placeholder="Suite 4"
              readOnly={readOnly}
              onChange={(event) =>
                updateField(value, "address_line2", event.target.value, onChange)
              }
            />
          </div>

          <div className={cn("grid gap-2", isPreview ? "grid-cols-2" : "sm:grid-cols-2")}>
            <div className={fieldGap}>
              <FormFieldLabel
                htmlFor="checkout-address-city"
                required
                className={labelClassName}
              >
                City
              </FormFieldLabel>
              <FormInput
                id="checkout-address-city"
                className={inputClassName}
                value={value.address_city ?? ""}
                placeholder="San Francisco"
                readOnly={readOnly}
                onChange={(event) =>
                  updateField(value, "address_city", event.target.value, onChange)
                }
              />
            </div>
            <div className={fieldGap}>
              <FormFieldLabel
                htmlFor="checkout-address-state"
                className={labelClassName}
              >
                State
              </FormFieldLabel>
              <FormInput
                id="checkout-address-state"
                className={inputClassName}
                value={value.address_state ?? ""}
                placeholder="CA"
                readOnly={readOnly}
                onChange={(event) =>
                  updateField(value, "address_state", event.target.value, onChange)
                }
              />
            </div>
          </div>

          <div className={cn("grid gap-2", isPreview ? "grid-cols-2" : "sm:grid-cols-2")}>
            <div className={fieldGap}>
              <FormFieldLabel
                htmlFor="checkout-address-postal"
                className={labelClassName}
              >
                Postal code
              </FormFieldLabel>
              <FormInput
                id="checkout-address-postal"
                className={inputClassName}
                value={value.address_postal_code ?? ""}
                placeholder="94105"
                readOnly={readOnly}
                onChange={(event) =>
                  updateField(
                    value,
                    "address_postal_code",
                    event.target.value,
                    onChange,
                  )
                }
              />
            </div>
            <div className={fieldGap}>
              <FormFieldLabel
                htmlFor="checkout-address-country"
                required
                className={labelClassName}
              >
                Country
              </FormFieldLabel>
              <FormInput
                id="checkout-address-country"
                className={inputClassName}
                value={value.address_country ?? ""}
                placeholder="United States"
                readOnly={readOnly}
                onChange={(event) =>
                  updateField(value, "address_country", event.target.value, onChange)
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
