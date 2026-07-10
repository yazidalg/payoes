import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import { parseFiatAmount } from "@/lib/invoices/amount";
import {
  isInvoiceCurrencyCode,
} from "@/lib/invoices/currencies";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import { createManualPaymentBodySchema } from "@/lib/payments/schemas";
import {
  createManualPayment,
  listPayments,
  listPaymentsPaginated,
  serializePayments,
} from "@/lib/payments/service";
import { parseStellarAmount } from "@/lib/stellar/amount";

const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  customerStatus: z.enum(["has_customer", "no_customer"]).optional(),
  status: z.enum(["pending", "completed", "failed", "expired"]).optional(),
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
  const parsedQuery = listPaymentsQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    customerStatus: searchParams.get("customerStatus") ?? undefined,
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
    parsedQuery.data.customerStatus !== undefined ||
    parsedQuery.data.status !== undefined ||
    parsedQuery.data.sortOrder !== undefined;

  if (hasListParams) {
    const result = await listPaymentsPaginated(
      organization.id,
      organization.environment,
      parsedQuery.data,
    );

    return NextResponse.json(result);
  }

  const paymentList = await listPayments(
    organization.id,
    organization.environment,
  );

  return NextResponse.json({
    payments: await serializePayments(paymentList),
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
  const parsed = createManualPaymentBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const currencyCode = parsed.data.currency_code?.trim().toUpperCase() ?? null;
  const usesFiatPricing = Boolean(currencyCode);

  if (currencyCode && !isInvoiceCurrencyCode(currencyCode)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const paidAt = new Date(parsed.data.paid_at);

  if (Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const assetConfig = await parseAndResolveAssetConfig(organization.id, {
      settlement_asset: parsed.data.settlement_asset,
      allowed_assets: parsed.data.allowed_assets,
    });

    const paidAsset =
      assetConfig.allowed_assets[0] ?? assetConfig.settlement_asset;

    const payment = usesFiatPricing
      ? await createManualPayment({
          organizationId: organization.id,
          environment: organization.environment,
          pricingAmount: parseFiatAmount(parsed.data.amount, currencyCode!),
          pricingCurrency: currencyCode,
          settlementAsset: assetConfig.settlement_asset,
          allowedAssets: assetConfig.allowed_assets,
          paidAsset,
          description: parsed.data.notes?.trim() || null,
          paidAt,
          customerId: parsed.data.customer_id,
        })
      : await createManualPayment({
          organizationId: organization.id,
          environment: organization.environment,
          assetAmount: parseStellarAmount(parsed.data.amount),
          settlementAsset: assetConfig.settlement_asset,
          allowedAssets: assetConfig.allowed_assets,
          paidAsset,
          description: parsed.data.notes?.trim() || null,
          paidAt,
          customerId: parsed.data.customer_id,
        });

    const serialized = await serializePayments([payment]);

    return NextResponse.json(serialized[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create payment",
      },
      { status: 400 },
    );
  }
}
