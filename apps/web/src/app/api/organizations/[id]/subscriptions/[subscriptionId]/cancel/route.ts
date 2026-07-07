import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  cancelSubscription,
  serializeSubscription,
} from "@/lib/subscriptions/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; subscriptionId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, subscriptionId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const subscription = await cancelSubscription(
      subscriptionId,
      organization.id
    );

    return NextResponse.json(serializeSubscription(subscription));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to cancel subscription",
      },
      { status: 400 }
    );
  }
}
