import { toast } from "sonner";

export type InvoiceEmailDelivery = {
  email_delivered?: boolean;
};

export function toastInvoiceSentToCustomer(
  delivery: InvoiceEmailDelivery,
  options?: { resend?: boolean },
) {
  if (delivery.email_delivered) {
    toast.success(options?.resend ? "Email sent" : "Invoice sent to customer");
    return;
  }

  toast.success(options?.resend ? "Invoice resent" : "Invoice sent", {
    description: "Share the payment link with your customer.",
  });
}
