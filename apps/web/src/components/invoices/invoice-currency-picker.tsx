"use client";

import { useMemo, useState } from "react";
import { INVOICE_CURRENCIES } from "@/constants/invoices/currencies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type InvoiceCurrencyPickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
};

export function InvoiceCurrencyPicker({
  id = "invoice-currency",
  label = "Invoice currency",
  value,
  onChange,
  disabled = false,
}: InvoiceCurrencyPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selected = useMemo(
    () => INVOICE_CURRENCIES.find((currency) => currency.code === value) ?? null,
    [value]
  );

  const filteredCurrencies = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return INVOICE_CURRENCIES;
    }

    return INVOICE_CURRENCIES.filter(
      (currency) =>
        currency.code.toLowerCase().includes(normalized) ||
        currency.label.toLowerCase().includes(normalized)
    );
  }, [query]);

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-search`}>{label}</Label>
      <div className="relative">
        <Input
          id={`${id}-search`}
          value={isOpen ? query : (selected?.label ?? value)}
          placeholder="Search currency by code or name..."
          disabled={disabled}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150);
          }}
        />

        {isOpen ? (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
            {filteredCurrencies.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No currencies found.
              </p>
            ) : (
              filteredCurrencies.map((currency) => {
                const isSelected = currency.code === value;

                return (
                  <button
                    key={currency.code}
                    type="button"
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm hover:bg-muted",
                      isSelected && "bg-primary/10"
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onChange(currency.code);
                      setQuery("");
                      setIsOpen(false);
                    }}
                  >
                    <span>{currency.label}</span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      <input type="hidden" id={id} name={id} value={value} readOnly />
    </div>
  );
}
