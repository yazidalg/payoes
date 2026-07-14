export type InvoiceActivityEvent = {
  id: string;
  label: string;
  at: string;
};

type InvoiceActivityInput = {
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
  sent_at?: string | Date | null;
  paid_at?: string | Date | null;
  checkout_session_id?: string | null;
  customer_email?: string | null;
};

function toTimestamp(value: string | Date) {
  return new Date(value).getTime();
}

function formatActivityDate(value: string | Date) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildInvoiceActivity(invoice: InvoiceActivityInput): InvoiceActivityEvent[] {
  const events: Array<InvoiceActivityEvent & { sortAt: number }> = [];

  if (invoice.paid_at) {
    events.push({
      id: "paid",
      label: "Invoice was marked as paid",
      at: formatActivityDate(invoice.paid_at),
      sortAt: toTimestamp(invoice.paid_at),
    });
  }

  if (invoice.sent_at) {
    const email = invoice.customer_email?.trim();
    events.push({
      id: "sent",
      label: email
        ? `Invoice was sent to ${email}`
        : "Invoice was sent to customer",
      at: formatActivityDate(invoice.sent_at),
      sortAt: toTimestamp(invoice.sent_at),
    });
  }

  if (
    invoice.checkout_session_id &&
    invoice.status !== "draft" &&
    invoice.status !== "void"
  ) {
    events.push({
      id: "payment-page",
      label: "Invoice payment page was created",
      at: formatActivityDate(invoice.updated_at),
      sortAt: toTimestamp(invoice.updated_at),
    });
  }

  if (invoice.status !== "draft" && invoice.status !== "void") {
    const finalizedAt = invoice.sent_at ?? invoice.updated_at;
    events.push({
      id: "finalized",
      label: "Invoice was finalized",
      at: formatActivityDate(finalizedAt),
      sortAt: toTimestamp(finalizedAt),
    });
  }

  events.push({
    id: "created",
    label: "Invoice was created",
    at: formatActivityDate(invoice.created_at),
    sortAt: toTimestamp(invoice.created_at),
  });

  const seen = new Set<string>();

  return events
    .sort((a, b) => b.sortAt - a.sortAt)
    .filter((event) => {
      const key = `${event.id}:${event.sortAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map(({ id, label, at }) => ({ id, label, at }));
}

export function canEditInvoice(status: string) {
  return status === "draft" || status === "open";
}

export function canResendInvoice(status: string) {
  return status === "open";
}

export function canChangeInvoiceCustomer(status: string) {
  return status === "draft" || status === "open";
}

export function canMarkInvoiceAsPaid(status: string) {
  return status === "open";
}

export function canVoidInvoice(status: string) {
  return status === "draft" || status === "open";
}

export function canDeleteInvoice(status: string) {
  return status === "draft";
}
