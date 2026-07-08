import { NextResponse } from "next/server";
import { getPublicInvoiceDetail } from "@/lib/invoices/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const detail = await getPublicInvoiceDetail(invoiceId);

  if (!detail) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({
    invoice: {
      id: detail.invoice.publicId,
      status: detail.invoice.status,
      amount: detail.invoice.amount,
      settlement_asset: {
        asset_code: detail.presentation.asset,
        issuer_address: null,
      },
      allowed_assets: (detail.presentation.allowedAssets ?? []).map((code) => ({
        asset_code: code,
        issuer_address: null,
      })),
      description: detail.invoice.description,
      due_at: detail.invoice.dueAt,
      paid_at: detail.invoice.paidAt,
      invoice_number: detail.presentation.invoiceNumber,
    },
    presentation: detail.presentation,
    checkout_url: detail.checkoutUrl,
  });
}
