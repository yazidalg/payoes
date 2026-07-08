import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseAndResolveAssetConfig } from "@/lib/assets/validation";
import { parseFiatAmount } from "@/lib/invoices/amount";
import {
  DEFAULT_INVOICE_CURRENCY_CODE,
  isInvoiceCurrencyCode,
} from "@/lib/invoices/currencies";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import { createManualPaymentBodySchema } from "@/lib/payments/schemas";
import {
  createManualPayment,
  listPayments,
  serializePayments,
} from "@/lib/payments/service";

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

  const paymentList = await listPayments(organization.id, organization.environment);
  return NextResponse.json({
    payments: await serializePayments(paymentList),
  });
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
  const parsed = createManualPaymentBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const currencyCode = parsed.data.currency_code.trim().toUpperCase();

  if (!isInvoiceCurrencyCode(currencyCode)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const paidAt = new Date(parsed.data.paid_at);

  if (Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const pricingAmount = parseFiatAmount(
      parsed.data.amount,
      currencyCode ?? DEFAULT_INVOICE_CURRENCY_CODE
    );

    const assetConfig = await parseAndResolveAssetConfig(organization.id, {
      settlement_asset: parsed.data.settlement_asset,
      allowed_assets: parsed.data.allowed_assets,
    });

    const paidAsset =
      assetConfig.allowed_assets[0] ?? assetConfig.settlement_asset;

    const payment = await createManualPayment({
      organizationId: organization.id,
      environment: organization.environment,
      pricingAmount,
      pricingCurrency: currencyCode,
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
      { status: 400 }
    );
  }
}
