import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateScopes } from "@/lib/api-keys/scopes";
import { getApiKey, revokeApiKey, updateApiKey } from "@/lib/api-keys/service";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

const updateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  scopes: z.array(z.string()).min(1, "At least one permission is required"),
});

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

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const parsed = updateApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  if (!validateScopes(parsed.data.scopes)) {
    return NextResponse.json({ error: "Invalid scopes" }, { status: 400 });
  }

  const apiKey = await updateApiKey(
    organization.id,
    keyId,
    organization.environment,
    parsed.data
  );

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
