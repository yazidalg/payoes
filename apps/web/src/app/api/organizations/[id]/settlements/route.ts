import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { listSettlementConversions } from "@/lib/settlements/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

  const settlements = await listSettlementConversions(
    organization.id,
    organization.environment
  );

  return NextResponse.json({ settlements });
}
