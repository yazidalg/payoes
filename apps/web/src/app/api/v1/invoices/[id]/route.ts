import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { getInvoiceDetail, serializeInvoice } from "@/lib/invoices/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(
    request,
    async ({ apiKey }) => {
      const { id } = await params;
      const detail = await getInvoiceDetail(
        id,
        apiKey.organizationId,
        apiKey.environment
      );

      if (!detail) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      return NextResponse.json(
        serializeInvoice(
          { ...detail.invoice, customerPublicId: detail.customerPublicId },
          {
            checkoutUrl: detail.checkoutUrl,
            checkoutSessionPublicId: detail.checkoutSessionPublicId,
          }
        )
      );
    },
    { resource: "invoices", action: "read" }
  );
}
