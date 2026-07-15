export type InvoiceDisplayStatus =
  | "draft"
  | "open"
  | "overdue"
  | "paid"
  | "void";

type InvoiceStatusInput = {
  status: string;
  due_at?: string | Date | null;
};

export function isInvoiceOverdue(invoice: InvoiceStatusInput) {
  if (invoice.status !== "open" || !invoice.due_at) {
    return false;
  }

  return new Date(invoice.due_at).getTime() < Date.now();
}

export function getInvoiceDisplayStatus(
  invoice: InvoiceStatusInput,
): InvoiceDisplayStatus {
  if (isInvoiceOverdue(invoice)) {
    return "overdue";
  }

  return invoice.status as InvoiceDisplayStatus;
}

export function formatInvoiceStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "open":
      return "Open";
    case "overdue":
      return "Overdue";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return status;
  }
}

export function getInvoiceCheckoutSessionExpiredMessage(
  invoice: Pick<InvoiceStatusInput, "due_at">,
) {
  if (isInvoiceOverdue({ status: "open", due_at: invoice.due_at })) {
    return "This checkout session has ended. This invoice is overdue. Ask the merchant for an updated payment link.";
  }

  return "This checkout session has ended. The invoice is still open. Ask the merchant for an updated payment link.";
}

export function getInvoiceCheckoutSessionExpiredSubtitle(
  invoice: Pick<InvoiceStatusInput, "due_at">,
) {
  if (isInvoiceOverdue({ status: "open", due_at: invoice.due_at })) {
    return "This invoice is overdue.";
  }

  return "This checkout session has ended.";
}
