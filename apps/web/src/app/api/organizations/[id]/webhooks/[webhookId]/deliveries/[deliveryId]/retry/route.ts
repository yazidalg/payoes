import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import { retryWebhookDelivery } from "@/lib/webhooks/service";

export async function POST(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; webhookId: string; deliveryId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, webhookId, deliveryId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await retryWebhookDelivery(
      organization.id,
      webhookId,
      deliveryId,
      organization.environment
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to retry delivery",
      },
      { status: 400 }
    );
  }
}
