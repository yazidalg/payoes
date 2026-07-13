"use client";

import { useMemo } from "react";
import type { CustomerOption } from "@/lib/payments/types";
import { customerLabel } from "@/lib/payments/types";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { Combobox, type ComboboxOption } from "@dub/ui";
import { cn } from "@dub/utils";

export function CustomerCombobox({
  customers,
  value,
  onChange,
  error,
  onTouch,
  id = "invoice-customer",
  label = "Customer",
  required = true,
  placeholder = "Select a customer",
  onCreate,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (customerId: string) => void;
  error?: string;
  onTouch?: () => void;
  id?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  onCreate?: (search: string) => Promise<boolean>;
}) {
  const options = useMemo<ComboboxOption[]>(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customerLabel(customer),
        meta: customer,
      })),
    [customers],
  );

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  return (
    <div className="space-y-2">
      <FormFieldLabel htmlFor={id} required={required}>
        {label}
      </FormFieldLabel>
      <Combobox
        selected={selected}
        setSelected={(option: ComboboxOption | null) => {
          onTouch?.();
          onChange(option?.value ?? "");
        }}
        options={options}
        placeholder={placeholder}
        searchPlaceholder="Search customers..."
        matchTriggerWidth
        optionDescription={(option) => {
          const customer = option.meta as CustomerOption | undefined;
          if (!customer?.email) {
            return (
              <span className="text-amber-700">
                Email required before sending an invoice
              </span>
            );
          }

          return customer.email;
        }}
        emptyState={
          <p className="px-2 py-4 text-center text-sm text-neutral-500">
            No customers found.
          </p>
        }
        onCreate={onCreate}
        createLabel={(search) =>
          search ? `Add customer "${search}"` : "Add customer..."
        }
        buttonProps={{
          id,
          className: cn(
            "h-10 w-full justify-between",
            error && "border-red-500",
          ),
          textWrapperClassName: "min-w-0 flex-1 text-left",
        }}
      />
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
