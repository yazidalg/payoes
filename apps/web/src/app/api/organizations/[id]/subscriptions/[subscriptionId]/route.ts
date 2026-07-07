import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getSubscriptionDetail,
  serializeSubscription,
} from "@/lib/subscriptions/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function GET(
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

  const detail = await getSubscriptionDetail(
    subscriptionId,
    organization.id,
    organization.environment
  );

  if (!detail) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json(
    serializeSubscription({
      ...detail.subscription,
      customerPublicId: detail.customerPublicId,
    })
  );
}
