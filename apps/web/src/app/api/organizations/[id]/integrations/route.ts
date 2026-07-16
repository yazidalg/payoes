import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import { listOrganizationIntegrations } from "@/lib/integrations/service";

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

  const integrations = await listOrganizationIntegrations(
    organization.id,
    organization.environment,
  );

  return NextResponse.json({ integrations });
}
