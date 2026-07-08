import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import { rotateWebhookSecret } from "@/lib/webhooks/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, webhookId } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = await rotateWebhookSecret(
    organization.id,
    webhookId,
    organization.environment
  );

  if (!secret) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ secret });
}
