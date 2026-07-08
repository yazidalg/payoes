import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findAllowedAsset } from "@/lib/assets/types";
import { serializePaymentAssets } from "@/lib/assets/serialize";
import { resolvePaymentForHostedCheckout } from "@/lib/checkout-sessions/service";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { confirmPaymentWithTxHash } from "@/lib/payments/verify";
import { setPaymentPaidAsset } from "@/lib/payments/service";
import { buildPaymentTransactionXdr } from "@/lib/stellar/payments";

const confirmSchema = z.object({
  txHash: z.string().min(1),
});

const paidAssetSchema = z.object({
  asset_code: z.string().min(1),
  issuer_address: z.string().nullable().optional(),
});

const buildTxSchema = z.object({
  sourcePublicKey: z.string().min(1),
  paid_asset: paidAssetSchema,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const resolved = await resolvePaymentForHostedCheckout(paymentId);

  if (!resolved) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { payment } = resolved;
  const assets = serializePaymentAssets(payment);

  const [organization] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      logoInitials: organizations.logoInitials,
    })
    .from(organizations)
    .where(eq(organizations.id, payment.organizationId))
    .limit(1);

  return NextResponse.json({
    payment: {
      id: payment.publicId,
      amount: payment.amount,
      ...assets,
      status: payment.status,
      description: payment.description,
      environment: payment.environment,
      expires_at: payment.expiresAt,
      receiving_address: payment.receivingAddress,
    },
    merchant: organization ?? null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const resolved = await resolvePaymentForHostedCheckout(paymentId);

  if (!resolved) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { payment } = resolved;
  const body = await request.json();

  if (body.action === "build_transaction") {
    const parsed = buildTxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const paidAsset = {
      asset_code: parsed.data.paid_asset.asset_code,
      issuer_address: parsed.data.paid_asset.issuer_address?.trim() || null,
    };

    const allowed = payment.allowedAssets ?? [];
    const match = findAllowedAsset(
      allowed,
      paidAsset.asset_code,
      paidAsset.issuer_address
    );

    if (!match) {
      return NextResponse.json(
        { error: "Selected asset is not allowed for this payment" },
        { status: 400 }
      );
    }

    try {
      const paymentWithPaidAsset = await setPaymentPaidAsset(payment, paidAsset);

      const xdr = await buildPaymentTransactionXdr({
        sourcePublicKey: parsed.data.sourcePublicKey,
        destinationPublicKey: paymentWithPaidAsset.receivingAddress,
        amount: paymentWithPaidAsset.amount,
        asset: {
          assetCode: paidAsset.asset_code,
          issuerAddress: paidAsset.issuer_address,
        },
        environment: paymentWithPaidAsset.environment,
        memo: paymentWithPaidAsset.memo,
      });

      return NextResponse.json({ xdr });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to build transaction",
        },
        { status: 400 }
      );
    }
  }

  const parsed = confirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await confirmPaymentWithTxHash(
    payment.publicId,
    parsed.data.txHash
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    status: result.payment.status,
    tx_hash: result.payment.txHash,
  });
}
