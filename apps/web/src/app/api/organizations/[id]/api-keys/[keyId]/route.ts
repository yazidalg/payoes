import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getApiKey, revokeApiKey } from "@/lib/api-keys/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, keyId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = await getApiKey(organization.id, keyId, organization.environment);

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({ apiKey });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, keyId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const revoked = await revokeApiKey(
    organization.id,
    keyId,
    organization.environment
  );

  if (!revoked) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
