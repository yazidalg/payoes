import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  getPaymentLinkForOrganization,
  serializePaymentLink,
} from "@/lib/payment-links/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const { id } = await params;
    const link = await getPaymentLinkForOrganization(id, apiKey.organizationId);

    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    return NextResponse.json(serializePaymentLink(link));
  });
}
