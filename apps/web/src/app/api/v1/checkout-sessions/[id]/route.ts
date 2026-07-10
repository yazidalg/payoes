import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  getCheckoutSessionDetail,
  serializeCheckoutSession,
} from "@/lib/checkout-sessions/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(
    request,
    async ({ apiKey }) => {
      const { id } = await params;
      const detail = await getCheckoutSessionDetail(
        id,
        apiKey.organizationId,
        apiKey.environment
      );

      if (!detail) {
        return NextResponse.json(
          { error: "Checkout session not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        serializeCheckoutSession(detail.session, {
          customerPublicId: detail.customerPublicId,
          paymentPublicId: detail.payment.publicId,
        })
      );
    },
    { resource: "checkout_sessions", action: "read" }
  );
}
