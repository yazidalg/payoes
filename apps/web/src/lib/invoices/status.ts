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

export function getInvoiceDisplayStatus(invoice: InvoiceStatusInput) {
  if (isInvoiceOverdue(invoice)) {
    return "overdue";
  }

  return invoice.status;
}
