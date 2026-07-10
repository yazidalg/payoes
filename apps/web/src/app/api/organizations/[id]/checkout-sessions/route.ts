import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import {
  createCheckoutSession,
  listCheckoutSessions,
  listCheckoutSessionsPaginated,
  serializeCheckoutSession,
} from "@/lib/checkout-sessions/service";
import { paymentAssetConfigFields } from "@/lib/payment-methods/schemas";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";

const listCheckoutSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  status: z.enum(["open", "complete", "expired"]).optional(),
});

const createCheckoutSessionSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  ...paymentAssetConfigFields,
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  expires_in_minutes: z.number().int().min(5).max(10080).optional(),
  customer_id: z.string().optional().nullable(),
  success_url: z.string().url().optional().nullable(),
  cancel_url: z.string().url().optional().nullable(),
});

export async function GET(
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

  const { searchParams } = new URL(request.url);
  const parsedQuery = listCheckoutSessionsQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const hasListParams =
    parsedQuery.data.page !== undefined ||
    parsedQuery.data.pageSize !== undefined ||
    parsedQuery.data.search !== undefined ||
    parsedQuery.data.status !== undefined ||
    parsedQuery.data.sortOrder !== undefined;

  if (hasListParams) {
    const result = await listCheckoutSessionsPaginated(
      organization.id,
      organization.environment,
      parsedQuery.data,
    );

    return NextResponse.json(result);
  }

  const sessions = await listCheckoutSessions(
    organization.id,
    organization.environment,
  );

  return NextResponse.json({
    checkout_sessions: sessions.map((row) => serializeCheckoutSession(row)),
  });
}

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
  const parsed = createCheckoutSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const assetConfig = await parseAndResolveAssetConfig(organization.id, {
      settlement_asset: parsed.data.settlement_asset,
      allowed_assets: parsed.data.allowed_assets,
    });

    const { session: checkoutSession, payment } = await createCheckoutSession({
      organizationId: organization.id,
      environment: organization.environment,
      amount: parsed.data.amount,
      settlementAsset: assetConfig.settlement_asset,
      allowedAssets: assetConfig.allowed_assets,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      expiresInMinutes: parsed.data.expires_in_minutes,
      customerId: parsed.data.customer_id,
      successUrl: parsed.data.success_url,
      cancelUrl: parsed.data.cancel_url,
    });

    return NextResponse.json(
      serializeCheckoutSession(checkoutSession, {
        paymentPublicId: payment.publicId,
        payment,
      }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create checkout session",
      },
      { status: 400 },
    );
  }
}
