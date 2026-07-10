import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import { finalizeInvoice, serializeInvoice } from "@/lib/invoices/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(
    request,
    async ({ apiKey }) => {
      const { id } = await params;

      try {
        const result = await finalizeInvoice(
          id,
          apiKey.organizationId,
          apiKey.environment
        );

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
              error instanceof Error ? error.message : "Unable to finalize invoice",
          },
          { status: 400 }
        );
      }
    },
    { resource: "invoices", action: "write" }
  );
}
