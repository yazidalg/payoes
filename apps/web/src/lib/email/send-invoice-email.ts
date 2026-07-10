import type { Organization } from "@/lib/db/schema";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import {
  createInvoiceEmailElement,
} from "@/lib/invoices/presentation";
import { sendEmail } from "@payoes/email";

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
    react: createInvoiceEmailElement(input.presentation, input.to),
  });
}
