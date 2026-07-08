import { formatInvoiceAmount } from "@/lib/invoices/amount";

export type InvoicePresentation = {
  invoiceNumber: string;
  status: string;
  amount: string;
  asset: string;
  description: string | null;
  dueAt: Date | null;
  createdAt: Date;
  environmentLabel?: string | null;
  organization: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  };
  customer: {
    name: string | null;
    email: string | null;
  };
  items: {
    description: string;
    quantity: string;
    unitAmount: string;
    lineAmount: string;
  }[];
  allowedAssets?: string[];
  hostedInvoiceUrl?: string | null;
  checkoutUrl?: string | null;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function buildInvoiceEmailHtml(input: InvoicePresentation) {
  const payUrl = input.checkoutUrl ?? input.hostedInvoiceUrl ?? "#";
  const itemRows = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">${item.description}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatInvoiceAmount(item.unitAmount, input.asset)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${formatInvoiceAmount(item.lineAmount, input.asset)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f8fafc;padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="padding:28px 32px 20px;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Invoice from ${input.organization.name}</p>
          <h1 style="margin:0;font-size:28px;color:#0f172a;">${formatInvoiceAmount(input.amount, input.asset)} due</h1>
          <p style="margin:8px 0 0;color:#475569;">Invoice ${input.invoiceNumber} · Due ${formatDate(input.dueAt)}</p>
        </div>
        <div style="padding:24px 32px;">
          <p style="margin:0 0 16px;color:#334155;">
            Hi${input.customer.name ? ` ${input.customer.name}` : ""},
          </p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">
            ${input.organization.name} sent you an invoice for ${formatInvoiceAmount(input.amount, input.asset)}.
            ${input.description ? `Memo: ${input.description}` : ""}
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0f172a;">
            <thead>
              <tr>
                <th style="text-align:left;padding-bottom:8px;color:#64748b;font-weight:600;">Description</th>
                <th style="text-align:right;padding-bottom:8px;color:#64748b;font-weight:600;">Qty</th>
                <th style="text-align:right;padding-bottom:8px;color:#64748b;font-weight:600;">Unit price</th>
                <th style="text-align:right;padding-bottom:8px;color:#64748b;font-weight:600;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="margin-top:20px;text-align:right;font-size:15px;font-weight:600;color:#0f172a;">
            Total due: ${formatInvoiceAmount(input.amount, input.asset)}
          </div>
          <div style="margin-top:28px;">
            <a href="${payUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
              Pay invoice
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
            You can also view this invoice online:
            <a href="${input.hostedInvoiceUrl ?? payUrl}" style="color:#2563eb;">${input.hostedInvoiceUrl ?? payUrl}</a>
          </p>
        </div>
      </div>
    </div>
  `.trim();
}

export function buildInvoiceEmailText(input: InvoicePresentation) {
  const payUrl = input.checkoutUrl ?? input.hostedInvoiceUrl ?? "";
  const lines = [
    `${input.organization.name} sent you invoice ${input.invoiceNumber}`,
    `Amount due: ${formatInvoiceAmount(input.amount, input.asset)}`,
    `Due date: ${formatDate(input.dueAt)}`,
    "",
    "Items:",
    ...input.items.map(
      (item) =>
        `- ${item.description} (${item.quantity} x ${formatInvoiceAmount(item.unitAmount, input.asset)}) = ${formatInvoiceAmount(item.lineAmount, input.asset)}`
    ),
    "",
    `Pay invoice: ${payUrl}`,
  ];

  if (input.hostedInvoiceUrl) {
    lines.push(`View invoice: ${input.hostedInvoiceUrl}`);
  }

  return lines.join("\n");
}
