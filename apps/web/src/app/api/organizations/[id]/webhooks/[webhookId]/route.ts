import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import {
  deleteWebhookEndpoint,
  getWebhookEndpoint,
  listWebhookDeliveriesForEndpoint,
} from "@/lib/webhooks/service";

export async function GET(
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

  const endpoint = await getWebhookEndpoint(
    organization.id,
    webhookId,
    organization.environment
  );

  if (!endpoint) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const deliveries = await listWebhookDeliveriesForEndpoint(
    organization.id,
    webhookId,
    organization.environment
  );

  return NextResponse.json({ endpoint, deliveries });
}

export async function DELETE(
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

  const deleted = await deleteWebhookEndpoint(
    organization.id,
    webhookId,
    organization.environment
  );

  if (!deleted) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
