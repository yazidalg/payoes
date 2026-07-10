"use client";

import { useCallback, useState } from "react";
import type { CustomerRow } from "@/lib/customers/types";
import { EditCustomerSheet } from "./edit-customer-sheet";

export function useEditCustomerSheet({
  organizationId,
  onUpdated,
}: {
  organizationId: string;
  onUpdated?: (customer: CustomerRow) => void;
}) {
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openEditCustomer = useCallback((nextCustomer: CustomerRow) => {
    setCustomer(nextCustomer);
    setIsOpen(true);
  }, []);

  const closeEditCustomer = useCallback(() => {
    setIsOpen(false);
    setCustomer(null);
  }, []);

  function EditCustomerSheetWrapper() {
    if (!customer) {
      return null;
    }

    return (
      <EditCustomerSheet
        organizationId={organizationId}
        customer={customer}
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeEditCustomer();
          } else {
            setIsOpen(true);
          }
        }}
        onUpdated={(updatedCustomer) => {
          onUpdated?.(updatedCustomer);
          closeEditCustomer();
        }}
      />
    );
  }

  return {
    openEditCustomer,
    closeEditCustomer,
    EditCustomerSheet: EditCustomerSheetWrapper,
  };
}
