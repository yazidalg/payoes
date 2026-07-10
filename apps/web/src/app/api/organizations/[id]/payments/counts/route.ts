import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getPaymentsHubCounts } from "@/lib/payments/hub-counts";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const counts = await getPaymentsHubCounts(
    organization.id,
    organization.environment,
  );

  return NextResponse.json({ counts });
}
