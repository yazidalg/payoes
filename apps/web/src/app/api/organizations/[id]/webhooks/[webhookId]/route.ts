import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { WEBHOOK_EVENTS } from "@/constants/webhooks/events";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import {
  deleteWebhookEndpoint,
  getWebhookEndpoint,
  listWebhookDeliveriesForEndpoint,
  rotateWebhookSecret,
  updateWebhookEndpoint,
} from "@/lib/webhooks/service";

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  enabled: z.boolean().optional(),
});

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

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const parsed = updateWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const endpoint = await updateWebhookEndpoint(
    organization.id,
    webhookId,
    organization.environment,
    parsed.data
  );

  if (!endpoint) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ endpoint });
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
