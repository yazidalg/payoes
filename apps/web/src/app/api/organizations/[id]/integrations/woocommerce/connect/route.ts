import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizationIntegrations } from "@/lib/db/schema";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import { upsertWooCommerceIntegration } from "@/lib/integrations/service";
import {
  registerWooCommerceOrderWebhook,
  validateWooCommerceCredentials,
} from "@/lib/integrations/woocommerce/orders";

const connectSchema = z.object({
  storeUrl: z.string().url("Store URL must be valid"),
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
});

export async function POST(
  request: Request,
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

  const body = await request.json();
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await validateWooCommerceCredentials(parsed.data);

    const integration = await upsertWooCommerceIntegration({
      organizationId: organization.id,
      environment: organization.environment,
      storeUrl: parsed.data.storeUrl,
      consumerKey: parsed.data.consumerKey,
      consumerSecret: parsed.data.consumerSecret,
    });

    const webhookId = await registerWooCommerceOrderWebhook({
      storeUrl: integration.storeIdentifier,
      credentials: {
        consumerKey: parsed.data.consumerKey,
        consumerSecret: parsed.data.consumerSecret,
      },
      secret: integration.webhookSecret ?? "",
    });

    const [updated] = await db
      .update(organizationIntegrations)
      .set({
        externalWebhookId: webhookId,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, integration.id))
      .returning();

    return NextResponse.json({ integration: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect WooCommerce",
      },
      { status: 400 },
    );
  }
}
