import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import { upsertPendingShopifyIntegration } from "@/lib/integrations/service";
import { buildShopifyOAuthUrl } from "@/lib/integrations/shopify/oauth";

const connectSchema = z.object({
  shop: z.string().min(1, "Shop domain is required"),
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
    await upsertPendingShopifyIntegration({
      organizationId: organization.id,
      environment: organization.environment,
      shop: parsed.data.shop,
    });

    const authorizationUrl = buildShopifyOAuthUrl({
      shop: parsed.data.shop,
      organizationId: organization.id,
      environment: organization.environment,
    });

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Shopify connection",
      },
      { status: 400 },
    );
  }
}
