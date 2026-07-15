import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findAllowedAsset, resolveAllowedAsset } from "@/lib/assets/types";
import { serializePaymentAssets } from "@/lib/assets/serialize";
import { getCheckoutLineItems } from "@/lib/checkout/line-items";
import { getCheckoutInvoiceDetails } from "@/lib/checkout/invoice-details";
import { getCheckoutCustomerCollection } from "@/lib/checkout/customer-collection";
import { isPaymentInProgressStatus } from "@/lib/checkout/payment-state";
import { resolvePaymentForHostedCheckout } from "@/lib/checkout-sessions/service";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { confirmPaymentWithTxHash } from "@/lib/payments/verify";
import {
  ensurePayablePayment,
  needsPaymentQuoteRefresh,
  refreshPaymentQuote,
} from "@/lib/payments/quote-service";
import {
  formatRefundReasonForCheckout,
  isRetryableFailedPayment,
} from "@/lib/payments/retry";
import {
  buildEscrowClassicDepositTransaction,
  confirmClassicEscrowDeposit,
  detectEscrowDepositForPayment,
  processEscrowSettlement,
  submitClassicEscrowDeposit,
} from "@/lib/payments/settlement/escrow";
import { setPaymentPaidAsset } from "@/lib/payments/service";
import { simulateSandboxPayment } from "@/lib/payments/simulate-sandbox-payment";
import {
  confirmEscrowContractDeposit,
  ensureEscrowPaymentRegisteredForCheckout,
} from "@/lib/soroban/escrow-contract";
import {
  SorobanSetupError,
  toSorobanErrorResponse,
} from "@/lib/soroban/setup-errors";
import { submitSorobanPaymentTransaction } from "@/lib/soroban/payment-router";

const confirmSchema = z.object({
  txHash: z.string().min(1),
});

const paidAssetSchema = z.object({
  asset_code: z.string().min(1),
  issuer_address: z.string().nullable().optional(),
});

const buildTxSchema = z.object({
  action: z.literal("build_transaction"),
  sourcePublicKey: z.string().min(1),
  paid_asset: paidAssetSchema,
});

const submitClassicSchema = z.object({
  action: z.literal("submit_classic"),
  signedXdr: z.string().min(1),
});

const confirmClassicDepositSchema = z.object({
  action: z.literal("confirm_classic_deposit"),
  txHash: z.string().min(1),
});

const submitSorobanSchema = z.object({
  action: z.literal("submit_soroban"),
  signedXdr: z.string().min(1),
});

const confirmEscrowContractSchema = z.object({
  action: z.literal("confirm_escrow_contract"),
  txHash: z.string().min(1),
  payerAddress: z.string().min(1),
});

function deprecatedPaymentFlowResponse() {
  return NextResponse.json(
    {
      error: "This payment uses a deprecated flow. Create a new payment to continue.",
      code: "deprecated_payment_flow",
    },
    { status: 410 },
  );
}

function sorobanErrorResponse(error: unknown, status = 400) {
  if (error instanceof SorobanSetupError) {
    return NextResponse.json(error.toJSON(), { status });
  }

  return NextResponse.json(toSorobanErrorResponse(error), { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const resolved = await resolvePaymentForHostedCheckout(paymentId);

  if (!resolved) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const lastAttemptError = isRetryableFailedPayment(resolved.payment)
    ? formatRefundReasonForCheckout(resolved.payment.refundReason)
    : null;

  const payable = await ensurePayablePayment(resolved.payment);
  const payment = payable.payment;
  const assets = serializePaymentAssets(payment);

  const [organization, items, invoice, customerCollection] = await Promise.all([
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
    getCheckoutInvoiceDetails(payment),
    getCheckoutCustomerCollection(payment),
  ]);

  return NextResponse.json({
    payment: {
      id: payment.publicId,
      amount: payment.quotedPaidAmount ?? payment.amount,
      ...assets,
      status: payment.status,
      session_error:
        payment.status === "completed" ? null : (payable.error ?? null),
      last_attempt_error: lastAttemptError,
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
      payment_flow: payment.paymentFlow,
      receiving_address: payment.receivingAddress,
      deposit_address: payment.depositAddress,
      memo: payment.memo,
    },
    items,
    merchant: organization,
    invoice,
    customer_collection: customerCollection,
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

  if (body.action === "check_deposit") {
    const payment = resolved.payment;
    const txHash =
      typeof body.tx_hash === "string" && body.tx_hash.trim().length > 0
        ? body.tx_hash.trim()
        : null;

    if (payment.paymentFlow !== "escrow") {
      return deprecatedPaymentFlowResponse();
    }

    if (payment.status === "completed") {
      return NextResponse.json({ status: "completed", detected: true });
    }

    try {
      if (txHash) {
        const confirmed = await confirmClassicEscrowDeposit(payment, txHash);

        if (confirmed.ok) {
          return NextResponse.json({
            status: "completed",
            detected: true,
            tx_hash: confirmed.payment.txHash,
          });
        }

        if ("pending" in confirmed && confirmed.pending) {
          const latest = confirmed.payment;
          if (latest.status === "completed") {
            return NextResponse.json({
              status: "completed",
              detected: true,
              tx_hash: latest.txHash,
            });
          }

          return NextResponse.json(
            {
              status: latest.status,
              detected: true,
              phase: "processing",
            },
            { status: 202 },
          );
        }
      }

      const result = await detectEscrowDepositForPayment(payment);

      if (result.payment.status === "completed") {
        return NextResponse.json({
          status: "completed",
          detected: true,
          tx_hash: result.payment.txHash,
        });
      }

      if (result.payment.status === "refunded") {
        return NextResponse.json({
          status: "refunded",
          detected: true,
        });
      }

      if (isPaymentInProgressStatus(result.payment.status)) {
        return NextResponse.json(
          { status: result.payment.status, detected: true, phase: "processing" },
          { status: 202 },
        );
      }

      if (result.payment.status === "settlement_failed") {
        return NextResponse.json(
          {
            status: "settlement_failed",
            detected: true,
            error:
              "Settlement could not be completed. Please contact the merchant if your funds were not returned.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        status: result.payment.status,
        detected: result.detected,
      });
    } catch (error) {
      return sorobanErrorResponse(error, 502);
    }
  }

  if (body.action === "simulate_payment") {
    const paidAsset = body.paid_asset
      ? {
          asset_code: String(body.paid_asset.asset_code),
          issuer_address: body.paid_asset.issuer_address?.trim() || null,
        }
      : undefined;

    try {
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
    } catch (error) {
      return sorobanErrorResponse(error);
    }
  }

  const payable = await ensurePayablePayment(resolved.payment);

  if (payable.error) {
    return NextResponse.json({ error: payable.error }, { status: 410 });
  }

  const { payment } = { payment: payable.payment };

  if (body.action === "confirm_classic_deposit") {
    const parsed = confirmClassicDepositSchema.safeParse(body);

    if (!parsed.success || payment.paymentFlow !== "escrow") {
      return deprecatedPaymentFlowResponse();
    }

    try {
      const result = await confirmClassicEscrowDeposit(payment, parsed.data.txHash);

      if (result.ok) {
        return NextResponse.json({
          status: result.payment.status,
          tx_hash: result.payment.txHash,
        });
      }

      if ("pending" in result && result.pending) {
        return NextResponse.json(
          {
            status: result.status,
            error: result.error ?? "Deposit is still processing.",
          },
          { status: 202 },
        );
      }

      return NextResponse.json(
        { error: result.error ?? "Unable to confirm deposit" },
        { status: 400 },
      );
    } catch (error) {
      return sorobanErrorResponse(error, 502);
    }
  }

  if (body.action === "confirm_escrow_contract") {
    const parsed = confirmEscrowContractSchema.safeParse(body);

    if (!parsed.success || payment.paymentFlow !== "escrow") {
      return deprecatedPaymentFlowResponse();
    }

    try {
      const depositAmount = payment.quotedPaidAmount ?? payment.amount;
      const result = await confirmEscrowContractDeposit({
        payment,
        txHash: parsed.data.txHash,
        payerAddress: parsed.data.payerAddress,
        amount: depositAmount,
      });

      if (!result.recorded) {
        return NextResponse.json({ status: result.status }, { status: 202 });
      }

      const settled = await processEscrowSettlement(result.payment);

      return NextResponse.json({
        status: settled.status,
        tx_hash: settled.txHash,
      });
    } catch (error) {
      return sorobanErrorResponse(error, 502);
    }
  }

  if (body.action === "submit_classic") {
    const parsed = submitClassicSchema.safeParse(body);

    if (!parsed.success || payment.paymentFlow !== "escrow") {
      return deprecatedPaymentFlowResponse();
    }

    try {
      const result = await submitClassicEscrowDeposit({
        payment,
        signedXdr: parsed.data.signedXdr,
      });

      return NextResponse.json({ tx_hash: result.hash, status: "processing" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit payment";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.action === "submit_soroban") {
    const parsed = submitSorobanSchema.safeParse(body);

    if (!parsed.success || payment.paymentFlow !== "escrow") {
      return deprecatedPaymentFlowResponse();
    }

    try {
      const result = await submitSorobanPaymentTransaction({
        payment,
        signedXdr: parsed.data.signedXdr,
      });

      return NextResponse.json({ tx_hash: result.hash, status: "processing" });
    } catch (error) {
      return sorobanErrorResponse(error, 400);
    }
  }

  if (body.action === "build_transaction") {
    const parsed = buildTxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (payment.paymentFlow !== "escrow") {
      return deprecatedPaymentFlowResponse();
    }

    const paidAsset = {
      asset_code: parsed.data.paid_asset.asset_code,
      issuer_address: parsed.data.paid_asset.issuer_address?.trim() || null,
    };

    const allowed = payment.allowedAssets ?? [];
    const match = findAllowedAsset(
      allowed,
      paidAsset.asset_code,
      paidAsset.issuer_address,
      payment.environment,
    );

    if (!match) {
      return NextResponse.json(
        { error: "Selected asset is not allowed for this payment" },
        { status: 400 }
      );
    }

    try {
      const canonicalPaidAsset = resolveAllowedAsset(match, payment.environment);
      let activePayment = payment;
      let quoteRefreshHandledRegistration = false;

      const shouldRefreshQuote =
        payment.pricingCurrency &&
        payment.pricingAmount &&
        needsPaymentQuoteRefresh(payment, canonicalPaidAsset);

      if (shouldRefreshQuote) {
        const refreshed = await refreshPaymentQuote(
          payment,
          canonicalPaidAsset,
        );
        activePayment = refreshed.payment;
        quoteRefreshHandledRegistration = true;
      } else {
        activePayment = await setPaymentPaidAsset(payment, canonicalPaidAsset);
      }

      if (activePayment.pricingCurrency && activePayment.pricingAmount) {
        if (!activePayment.quotedPaidAmount) {
          return NextResponse.json(
            { error: "Payment quote is missing. Try again in a moment." },
            { status: 400 }
          );
        }
      }

      const depositAmount = activePayment.quotedPaidAmount ?? activePayment.amount;

      await ensureEscrowPaymentRegisteredForCheckout(activePayment, {
        skipIfQuoteRefreshHandled: quoteRefreshHandledRegistration,
      });
      const classicDeposit = await buildEscrowClassicDepositTransaction({
        payment: activePayment,
        payerAddress: parsed.data.sourcePublicKey,
        amount: depositAmount,
        paidAsset: canonicalPaidAsset,
      });

      return NextResponse.json({
        xdr: classicDeposit.xdr,
        payment_type: "escrow_classic_deposit",
      });
    } catch (error) {
      return sorobanErrorResponse(error);
    }
  }

  const parsed = confirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (payment.paymentFlow !== "escrow") {
    return deprecatedPaymentFlowResponse();
  }

  return NextResponse.json(
    {
      error:
        "Use confirm_escrow_contract after submitting a Soroban escrow deposit transaction.",
      code: "deprecated_confirmation_flow",
    },
    { status: 410 },
  );
}
