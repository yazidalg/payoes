import { NextResponse } from "next/server";
import { getPublicInvoiceDetail } from "@/lib/invoices/service";
import { isInvoiceCurrencyCode } from "@/lib/invoices/currencies";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const detail = await getPublicInvoiceDetail(invoiceId);

  if (!detail) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const currencyCode = isInvoiceCurrencyCode(detail.invoice.currencyCode)
    ? detail.invoice.currencyCode
    : "USD";

  return NextResponse.json({
    invoice: {
      id: detail.invoice.publicId,
      status: detail.invoice.status,
      amount: detail.invoice.amount,
      currency_code: currencyCode,
      environment: detail.invoice.environment,
      settlement_asset: {
        asset_code: detail.presentation.allowedAssets?.[0] ?? "USDC",
        issuer_address: null,
      },
      allowed_assets: detail.allowedAssets,
      description: detail.invoice.description,
      due_at: detail.invoice.dueAt,
      paid_at: detail.invoice.paidAt,
      invoice_number: detail.presentation.invoiceNumber,
    },
    presentation: detail.presentation,
    checkout_url: detail.checkoutUrl,
    payment_id: detail.paymentPublicId,
  });
}
