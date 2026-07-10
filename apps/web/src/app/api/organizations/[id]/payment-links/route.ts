import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import {
  createPaymentLink,
  listPaymentLinks,
  listPaymentLinksPaginated,
  serializePaymentLink,
} from "@/lib/payment-links/service";
import { createPaymentLinkBodySchema } from "@/lib/payment-links/schemas";
import { resolveInvoiceCurrencyCode } from "@/lib/invoices/currencies";
import {
  getOrganizationForMember,
  organizationHasSettlementWallet,
  settlementWalletNotConfiguredMessage,
} from "@/lib/organizations/settlement-wallet";

const listPaymentLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
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
  const parsedQuery = listPaymentLinksQuerySchema.safeParse({
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
    const result = await listPaymentLinksPaginated(
      organization.id,
      organization.environment,
      parsedQuery.data,
    );

    return NextResponse.json(result);
  }

  const links = await listPaymentLinks(organization.id, organization.environment);

  return NextResponse.json({
    payment_links: await Promise.all(links.map((link) => serializePaymentLink(link))),
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
  const parsed = createPaymentLinkBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const hasWallet = await organizationHasSettlementWallet(
    organization.id,
    organization.environment,
  );

  if (!hasWallet) {
    return NextResponse.json(
      { error: settlementWalletNotConfiguredMessage(organization.environment) },
      { status: 400 },
    );
  }

  try {
    const assetConfig = await parseAndResolveAssetConfig(organization.id, {
      settlement_asset: parsed.data.settlement_asset,
      allowed_assets: parsed.data.allowed_assets,
    });

    const currencyCode = resolveInvoiceCurrencyCode(parsed.data.currency_code);

    const link = await createPaymentLink({
      organizationId: organization.id,
      environment: organization.environment,
      currencyCode,
      items: parsed.data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unit_amount,
      })),
      settlementAsset: assetConfig.settlement_asset,
      allowedAssets: assetConfig.allowed_assets,
      description: parsed.data.description,
      customerCollection: parsed.data.customer_collection,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json(
      await serializePaymentLink(link, { includeItems: true }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create payment link",
      },
      { status: 400 },
    );
  }
}
