import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { getInvoiceDetail, serializeInvoice } from "@/lib/invoices/service";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const { id } = await params;
    const detail = await getInvoiceDetail(id, apiKey.organizationId);

    if (!detail) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let subscriptionPublicId: string | null = null;

    if (detail.invoice.subscriptionId) {
      const [sub] = await db
        .select({ publicId: subscriptions.publicId })
        .from(subscriptions)
        .where(eq(subscriptions.id, detail.invoice.subscriptionId))
        .limit(1);

      subscriptionPublicId = sub?.publicId ?? null;
    }

    return NextResponse.json(
      serializeInvoice(
        { ...detail.invoice, customerPublicId: detail.customerPublicId },
        {
          checkoutUrl: detail.checkoutUrl,
          checkoutSessionPublicId: detail.checkoutSessionPublicId,
          subscriptionPublicId,
        }
      )
    );
  });
}
