import { DEFAULT_AUTH_URL } from "@/constants/app";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import { renderEmail } from "@payoes/email/render";
import InvoiceEmail from "@payoes/email/templates/invoice";
import { createElement } from "react";

export type InvoicePresentation = {
  invoiceNumber: string;
  status: string;
  amount: string;
  /** @deprecated Use currencyCode */
  asset: string;
  currencyCode: string;
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
    id?: string;
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
    return "N/A";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getWordmarkUrl() {
  const appUrl = process.env.AUTH_URL ?? DEFAULT_AUTH_URL;
  return `${appUrl.replace(/\/$/, "")}/logo.svg`;
}

export function mapInvoicePresentationToEmailProps(
  input: InvoicePresentation,
  email: string,
) {
  const payUrl = input.checkoutUrl ?? input.hostedInvoiceUrl ?? "#";

  return {
    email,
    invoiceNumber: input.invoiceNumber,
    amountDue: formatInvoiceAmount(input.amount, input.currencyCode),
    dueDateLabel: formatDate(input.dueAt),
    organizationName: input.organization.name,
    customerName: input.customer.name,
    description: input.description,
    items: input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmount: formatInvoiceAmount(item.unitAmount, input.currencyCode),
      lineAmount: formatInvoiceAmount(item.lineAmount, input.currencyCode),
    })),
    payUrl,
    hostedInvoiceUrl: input.hostedInvoiceUrl,
    environmentLabel: input.environmentLabel ?? null,
    wordmarkUrl: getWordmarkUrl(),
  };
}

export function createInvoiceEmailElement(
  input: InvoicePresentation,
  email?: string,
) {
  return createElement(
    InvoiceEmail,
    mapInvoicePresentationToEmailProps(
      input,
      email ?? input.customer.email ?? "customer@example.com",
    ),
  );
}

export async function renderInvoiceEmailHtml(input: InvoicePresentation) {
  const { html } = await renderEmail(createInvoiceEmailElement(input));

  return html;
}

export function buildInvoiceEmailText(input: InvoicePresentation) {
  const payUrl = input.checkoutUrl ?? input.hostedInvoiceUrl ?? "";
  const lines = [
    `${input.organization.name} sent you invoice ${input.invoiceNumber}`,
    `Amount due: ${formatInvoiceAmount(input.amount, input.currencyCode)}`,
    `Due date: ${formatDate(input.dueAt)}`,
    "",
    "Items:",
    ...input.items.map(
      (item) =>
        `- ${item.description} (${item.quantity} x ${formatInvoiceAmount(item.unitAmount, input.currencyCode)}) = ${formatInvoiceAmount(item.lineAmount, input.currencyCode)}`
    ),
    "",
    `Pay invoice: ${payUrl}`,
  ];

  if (input.hostedInvoiceUrl) {
    lines.push(`View invoice: ${input.hostedInvoiceUrl}`);
  }

  return lines.join("\n");
}
