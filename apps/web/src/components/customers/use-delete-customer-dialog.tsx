"use client";

import { apiFetch } from "@/lib/api-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@dub/ui";
import { toast } from "sonner";
import type { CustomerRow } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";
import { AppModal } from "@/ui/modals/app-modal";

export function useDeleteCustomerDialog({
  organizationId,
  onDeleted,
  redirectToList = false,
}: {
  organizationId: string;
  onDeleted?: () => void;
  redirectToList?: boolean;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open && !isDeleting) {
      setCustomer(null);
    }
  }

  async function handleDelete() {
    if (!customer) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/customers/${customer.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "Unable to delete customer");
        setIsDeleting(false);
        return;
      }

      toast.success("Customer deleted");
      setCustomer(null);
      onDeleted?.();

      if (redirectToList) {
        router.push("/dashboard/customers");
        return;
      }

      setIsDeleting(false);
    } catch {
      toast.error("Unable to delete customer");
      setIsDeleting(false);
    }
  }

  function DeleteCustomerDialog() {
    return (
      <AppModal
        open={customer !== null}
        onOpenChange={handleOpenChange}
        title="Delete customer?"
        description="This permanently deletes this customer. This action cannot be undone."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              disabled={isDeleting}
              onClick={() => handleOpenChange(false)}
            />
            <Button
              type="button"
              variant="danger"
              text="Delete customer"
              loading={isDeleting}
              className="h-9 w-fit"
              onClick={() => void handleDelete()}
            />
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">
            {customer ? formatCustomerLabel(customer) : "This customer"}
          </span>{" "}
          will be removed. Associated invoices will also be deleted. Payment
          records will remain, but will no longer be linked to this customer.
        </p>
      </AppModal>
    );
  }

  return {
    openDeleteCustomer: setCustomer,
    DeleteCustomerDialog,
  };
}
