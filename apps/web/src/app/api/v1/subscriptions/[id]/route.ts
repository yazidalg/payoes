import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  getSubscriptionDetail,
  serializeSubscription,
} from "@/lib/subscriptions/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const { id } = await params;
    const detail = await getSubscriptionDetail(id, apiKey.organizationId);

    if (!detail) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      serializeSubscription({
        ...detail.subscription,
        customerPublicId: detail.customerPublicId,
      })
    );
  });
}
