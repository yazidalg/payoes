import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { billSubscription } from "@/lib/subscriptions/service";
import { serializeInvoice } from "@/lib/invoices/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const { id } = await params;

    try {
      const result = await billSubscription(id, apiKey.organizationId);

      return NextResponse.json({
        invoice: serializeInvoice(result.invoice, {
          checkoutUrl: result.checkoutUrl,
          checkoutSessionPublicId: result.session.publicId,
        }),
        checkout_url: result.checkoutUrl,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unable to bill subscription",
        },
        { status: 400 }
      );
    }
  });
}
