"use client";

import { useMemo, type ReactNode } from "react";
import { INVOICE_CURRENCIES } from "@/constants/invoices/currencies";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { Combobox, type ComboboxOption } from "@dub/ui";
import { cn } from "@dub/utils";

type InvoiceCurrencyPickerProps = {
  id?: string;
  label?: ReactNode;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: string;
  onTouch?: () => void;
  hideHelperText?: boolean;
};

export function InvoiceCurrencyPicker({
  id = "invoice-currency",
  label = "Currency",
  value,
  onChange,
  disabled = false,
  error,
  onTouch,
  hideHelperText = false,
}: InvoiceCurrencyPickerProps) {
  const options = useMemo<ComboboxOption[]>(
    () =>
      INVOICE_CURRENCIES.map((currency) => ({
        value: currency.code,
        label: currency.label,
      })),
    [],
  );

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  return (
    <div className="space-y-2">
      <FormFieldLabel htmlFor={id}>{label}</FormFieldLabel>
      <Combobox
        selected={selected}
        setSelected={(option: ComboboxOption | null) => {
          onTouch?.();
          if (option) {
            onChange(option.value);
          }
        }}
        options={options}
        placeholder="Select currency"
        searchPlaceholder="Search currency..."
        matchTriggerWidth
        buttonProps={{
          className: cn(
            "h-10 w-full justify-between",
            error && "border-red-500",
            disabled && "pointer-events-none opacity-50",
          ),
          textWrapperClassName: "min-w-0 flex-1 text-left",
        }}
      />
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hideHelperText ? null : (
        <p className="text-content-subtle text-xs">
          Customers can pay with any enabled Stellar token at checkout. The
          invoice total stays in this currency.
        </p>
      )}
    </div>
  );
}
