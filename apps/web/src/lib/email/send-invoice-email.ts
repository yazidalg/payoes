import type { Organization } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailText,
  type InvoicePresentation,
} from "@/lib/invoices/presentation";

export async function sendInvoiceEmail(input: {
  to: string;
  presentation: InvoicePresentation;
  environment: Organization["environment"];
}) {
  const baseSubject = `Invoice ${input.presentation.invoiceNumber} from ${input.presentation.organization.name}`;
  const subject =
    input.environment === "sandbox" ? `[Sandbox] ${baseSubject}` : baseSubject;

  return sendEmail({
    to: input.to,
    subject,
    text: buildInvoiceEmailText(input.presentation),
    html: buildInvoiceEmailHtml(input.presentation),
  });
}
