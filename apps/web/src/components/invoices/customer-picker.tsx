"use client";

import { useMemo, useState } from "react";
import type { CustomerOption } from "@/lib/payments/types";
import { customerLabel } from "@/lib/payments/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (customerId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return customers;
    }

    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.email,
        customer.primary_stellar_address,
        customer.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [customers, query]);

  const selectedCustomer = customers.find((customer) => customer.id === value);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find or add a customer..."
      />

      <div className="max-h-44 overflow-auto rounded-lg border">
        {filteredCustomers.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            No customers match your search.
          </p>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onChange(customer.id)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50",
                value === customer.id && "bg-primary/5"
              )}
            >
              <span className="text-sm font-medium">{customerLabel(customer)}</span>
              {customer.email ? (
                <span className="text-xs text-muted-foreground">{customer.email}</span>
              ) : (
                <span className="text-xs text-amber-700">
                  Email required before sending an invoice
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {selectedCustomer ? (
        <p className="text-xs text-muted-foreground">
          Selected: {customerLabel(selectedCustomer)}
          {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}
        </p>
      ) : null}
    </div>
  );
}
