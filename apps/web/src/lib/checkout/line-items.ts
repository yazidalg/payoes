import { eq } from "drizzle-orm";
import { lineItemAmount } from "@/lib/invoices/amount";
import { getInvoiceCurrency, type InvoiceCurrencyCode } from "@/lib/invoices/currencies";
import { listInvoiceItems } from "@/lib/invoices/service";
import { listPaymentLinkItems } from "@/lib/payment-links/service";
import { db } from "@/lib/db";
import { invoices, paymentLinks, type Payment } from "@/lib/db/schema";

export type CheckoutLineItem = {
  description: string;
  quantity: string;
  unit_amount: string;
  line_amount: string;
};

function serializeItems(
  items: Array<{
    description: string;
    quantity: string;
    unitAmount: string;
  }>,
  currencyCode: InvoiceCurrencyCode,
): CheckoutLineItem[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit_amount: item.unitAmount,
    line_amount: lineItemAmount(
      {
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
      },
      currencyCode,
    ),
  }));
}

function fallbackItem(
  payment: Payment,
  currencyCode: InvoiceCurrencyCode | null,
): CheckoutLineItem[] {
  if (!payment.description?.trim()) {
    return [];
  }

  const amount = payment.pricingAmount ?? payment.amount;

  return [
    {
      description: payment.description.trim(),
      quantity: "1",
      unit_amount: amount,
      line_amount: amount,
    },
  ];
}

export async function getCheckoutLineItems(
  payment: Payment,
): Promise<CheckoutLineItem[]> {
  if (payment.invoiceId) {
    const [invoice] = await db
      .select({ currencyCode: invoices.currencyCode })
      .from(invoices)
      .where(eq(invoices.id, payment.invoiceId))
      .limit(1);

    if (!invoice) {
      return fallbackItem(payment, null);
    }

    const currencyCode = invoice.currencyCode as InvoiceCurrencyCode;
    const items = await listInvoiceItems(payment.invoiceId);

    if (items.length === 0) {
      return fallbackItem(payment, currencyCode);
    }

    return serializeItems(items, currencyCode);
  }

  if (payment.paymentLinkId) {
    const [link] = await db
      .select({ currencyCode: paymentLinks.currencyCode })
      .from(paymentLinks)
      .where(eq(paymentLinks.id, payment.paymentLinkId))
      .limit(1);

    if (!link) {
      return fallbackItem(payment, null);
    }

    const currencyCode = (link.currencyCode ??
      payment.pricingCurrency ??
      "USD") as InvoiceCurrencyCode;

    if (!getInvoiceCurrency(currencyCode)) {
      return fallbackItem(payment, null);
    }

    const items = await listPaymentLinkItems(payment.paymentLinkId);

    if (items.length === 0) {
      return fallbackItem(payment, currencyCode);
    }

    return serializeItems(items, currencyCode);
  }

  return fallbackItem(
    payment,
    (payment.pricingCurrency as InvoiceCurrencyCode | null) ?? null,
  );
}
