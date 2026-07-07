import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getCheckoutSessionDetail,
  serializeCheckoutSession,
} from "@/lib/checkout-sessions/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sessionId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const detail = await getCheckoutSessionDetail(
    sessionId,
    organization.id,
    organization.environment
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
}
