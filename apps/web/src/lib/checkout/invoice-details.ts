import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, invoices, type Payment } from "@/lib/db/schema";

export type CheckoutInvoiceDetails = {
  invoice_number: string;
  due_at: string | null;
  memo: string | null;
  customer: {
    name: string | null;
    email: string | null;
  };
};

export async function getCheckoutInvoiceDetails(
  payment: Payment,
): Promise<CheckoutInvoiceDetails | null> {
  if (!payment.invoiceId) {
    return null;
  }

  const [row] = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      publicId: invoices.publicId,
      dueAt: invoices.dueAt,
      description: invoices.description,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.id, payment.invoiceId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    invoice_number: row.invoiceNumber ?? row.publicId,
    due_at: row.dueAt?.toISOString() ?? null,
    memo: row.description,
    customer: {
      name: row.customerName,
      email: row.customerEmail,
    },
  };
}
