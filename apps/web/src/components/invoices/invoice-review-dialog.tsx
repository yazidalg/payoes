"use client";

import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import type { CustomerOption } from "@/lib/payments/types";
import { customerLabel } from "@/lib/payments/types";

export function InvoiceReviewDialog({
  open,
  onOpenChange,
  presentation,
  customer,
  isSending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentation: InvoicePresentation;
  customer: CustomerOption | null;
  isSending: boolean;
  onSend: () => void;
}) {
  const missingEmail = !customer?.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review and send invoice</DialogTitle>
          <DialogDescription>
            Confirm the invoice details before sending it to your customer by email.
          </DialogDescription>
        </DialogHeader>

        {missingEmail ? (
          <AlertBlock type="error">
            The selected customer needs an email address before you can send this
            invoice.
          </AlertBlock>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">
                {customer ? customerLabel(customer) : "Not selected"}
              </p>
              {customer?.email ? (
                <p className="text-muted-foreground">{customer.email}</p>
              ) : null}
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">
                {formatInvoiceAmount(presentation.amount, presentation.asset)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Delivery</p>
              <p className="font-medium">Email with payment link</p>
            </div>
          </div>

          <InvoiceDocument presentation={presentation} compact />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Back to edit
          </Button>
          <Button
            type="button"
            onClick={onSend}
            isLoading={isSending}
            disabled={missingEmail}
          >
            Send invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
