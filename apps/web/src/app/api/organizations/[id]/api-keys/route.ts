import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateScopes } from "@/lib/api-keys/scopes";
import { createApiKey, listApiKeys } from "@/lib/api-keys/service";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  scopes: z.array(z.string()).min(1, "At least one permission is required"),
});

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

  const keys = await listApiKeys(organization.id, organization.environment);
  return NextResponse.json({ apiKeys: keys });
}

export async function POST(
  request: Request,
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

  const body = await request.json();
  const parsed = createApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  if (!validateScopes(parsed.data.scopes)) {
    return NextResponse.json({ error: "Invalid scopes" }, { status: 400 });
  }

  const { apiKey, rawKey } = await createApiKey({
    organizationId: organization.id,
    name: parsed.data.name,
    environment: organization.environment,
    scopes: parsed.data.scopes,
  });

  return NextResponse.json({ apiKey, secret: rawKey }, { status: 201 });
}
