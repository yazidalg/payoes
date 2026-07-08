import { sendEmail } from "@/lib/email/client";
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailText,
  type InvoicePresentation,
} from "@/lib/invoices/presentation";

export async function sendInvoiceEmail(input: {
  to: string;
  presentation: InvoicePresentation;
}) {
  const subject = `Invoice ${input.presentation.invoiceNumber} from ${input.presentation.organization.name}`;

  return sendEmail({
    to: input.to,
    subject,
    text: buildInvoiceEmailText(input.presentation),
    html: buildInvoiceEmailHtml(input.presentation),
  });
}
