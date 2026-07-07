import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import {
  createWebhookEndpoint,
  listWebhookDeliveries,
  listWebhookEndpoints,
} from "@/lib/webhooks/service";

const webhookSchema = z.object({
  url: z.string().url("Webhook URL must be valid"),
  events: z
    .array(
      z.enum([
        "payment.created",
        "payment.completed",
        "payment.failed",
        "payment.expired",
      ])
    )
    .min(1),
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

  const [endpoints, deliveries] = await Promise.all([
    listWebhookEndpoints(organization.id),
    listWebhookDeliveries(organization.id),
  ]);

  return NextResponse.json({ endpoints, deliveries });
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
  const parsed = webhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const endpoint = await createWebhookEndpoint({
    organizationId: organization.id,
    url: parsed.data.url,
    events: parsed.data.events,
  });

  return NextResponse.json({ endpoint }, { status: 201 });
}
