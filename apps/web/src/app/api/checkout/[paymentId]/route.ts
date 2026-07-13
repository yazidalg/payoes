import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findAllowedAsset } from "@/lib/assets/types";
import { serializePaymentAssets } from "@/lib/assets/serialize";
import { getCheckoutLineItems } from "@/lib/checkout/line-items";
import { resolvePaymentForHostedCheckout } from "@/lib/checkout-sessions/service";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { confirmPaymentWithTxHash } from "@/lib/payments/verify";
import {
  ensurePayablePayment,
  needsPaymentQuoteRefresh,
  refreshPaymentQuote,
} from "@/lib/payments/quote-service";
import { setPaymentPaidAsset } from "@/lib/payments/service";
import { simulateSandboxPayment } from "@/lib/payments/simulate-sandbox-payment";
import { applySendMaxBuffer, assetsMatch } from "@/lib/pricing/quotes";
import {
  buildPathPaymentStrictReceiveXdr,
  buildPaymentTransactionXdr,
} from "@/lib/stellar/payments";

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

  const payable = await ensurePayablePayment(resolved.payment);
  const payment = payable.payment;
  const assets = serializePaymentAssets(payment);

  const [organization, items] = await Promise.all([
    db
      .select({
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        logoInitials: organizations.logoInitials,
      })
      .from(organizations)
      .where(eq(organizations.id, payment.organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getCheckoutLineItems(payment),
  ]);

  return NextResponse.json({
    payment: {
      id: payment.publicId,
      amount: payment.quotedPaidAmount ?? payment.amount,
      ...assets,
      status: payment.status,
      session_error: payable.error ?? null,
      description: payment.description,
      environment: payment.environment,
      expires_at: payment.expiresAt,
      quote_expires_at: payment.quoteExpiresAt,
      pricing_currency: payment.pricingCurrency,
      pricing_amount: payment.pricingAmount,
      quoted_paid_amount: payment.quotedPaidAmount,
      quoted_settlement_amount: payment.quotedSettlementAmount,
      quote_rate: payment.quoteRate,
      settlement_quote_rate: payment.settlementQuoteRate,
      source_type: payment.sourceType,
      receiving_address: payment.receivingAddress,
      memo: payment.memo,
    },
    items,
    merchant: organization,
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

  const body = await request.json();

  if (body.action === "simulate_payment") {
    const paidAsset = body.paid_asset
      ? {
          asset_code: String(body.paid_asset.asset_code),
          issuer_address: body.paid_asset.issuer_address?.trim() || null,
        }
      : undefined;

    const result = await simulateSandboxPayment(
      resolved.payment.publicId,
      paidAsset,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      status: result.payment.status,
      tx_hash: result.payment.txHash,
      simulated: true,
    });
  }

  const payable = await ensurePayablePayment(resolved.payment);

  if (payable.error) {
    return NextResponse.json({ error: payable.error }, { status: 410 });
  }

  const { payment } = { payment: payable.payment };

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
      let activePayment = await setPaymentPaidAsset(payment, paidAsset);

      if (activePayment.pricingCurrency && activePayment.pricingAmount) {
        if (needsPaymentQuoteRefresh(activePayment, paidAsset)) {
          const refreshed = await refreshPaymentQuote(activePayment, paidAsset);
          activePayment = refreshed.payment;
        }

        if (!activePayment.quotedPaidAmount) {
          return NextResponse.json(
            { error: "Payment quote is missing. Try again in a moment." },
            { status: 400 }
          );
        }
      }

      const paymentWithPaidAsset = activePayment;

      const settlementAsset = {
        asset_code: payment.settlementAsset,
        issuer_address: payment.settlementAssetIssuer,
      };

      const requiresPathPayment =
        paymentWithPaidAsset.quotedSettlementAmount &&
        !assetsMatch(match, settlementAsset);

      if (requiresPathPayment) {
        if (!paymentWithPaidAsset.quotedSettlementAmount) {
          return NextResponse.json(
            { error: "Settlement quote is missing. Try again in a moment." },
            { status: 400 }
          );
        }

        const xdr = await buildPathPaymentStrictReceiveXdr({
          sourcePublicKey: parsed.data.sourcePublicKey,
          destinationPublicKey: paymentWithPaidAsset.receivingAddress,
          sendAsset: {
            assetCode: paidAsset.asset_code,
            issuerAddress: paidAsset.issuer_address,
          },
          sendMax: applySendMaxBuffer(paymentWithPaidAsset.quotedPaidAmount!),
          destAsset: {
            assetCode: settlementAsset.asset_code,
            issuerAddress: settlementAsset.issuer_address,
          },
          destAmount: paymentWithPaidAsset.quotedSettlementAmount,
          environment: paymentWithPaidAsset.environment,
          memo: paymentWithPaidAsset.memo,
        });

        return NextResponse.json({ xdr, payment_type: "path_payment" });
      }

      const xdr = await buildPaymentTransactionXdr({
        sourcePublicKey: parsed.data.sourcePublicKey,
        destinationPublicKey: paymentWithPaidAsset.receivingAddress,
        amount: paymentWithPaidAsset.quotedPaidAmount ?? paymentWithPaidAsset.amount,
        asset: {
          assetCode: paidAsset.asset_code,
          issuerAddress: paidAsset.issuer_address,
        },
        environment: paymentWithPaidAsset.environment,
        memo: paymentWithPaidAsset.memo,
      });

      return NextResponse.json({ xdr, payment_type: "payment" });
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
