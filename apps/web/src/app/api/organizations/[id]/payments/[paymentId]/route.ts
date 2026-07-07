import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getPaymentForOrganization,
  serializePayments,
} from "@/lib/payments/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, paymentId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payment = await getPaymentForOrganization(paymentId, organization.id);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const [serialized] = await serializePayments([payment]);

  return NextResponse.json(serialized);
}
