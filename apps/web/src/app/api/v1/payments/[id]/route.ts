import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  getPaymentByPublicId,
  serializePayments,
} from "@/lib/payments/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const { id } = await params;
    const payment = await getPaymentByPublicId(id);

    if (!payment || payment.organizationId !== apiKey.organizationId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const serialized = await serializePayments([payment]);

    return NextResponse.json(serialized[0]);
  });
}
