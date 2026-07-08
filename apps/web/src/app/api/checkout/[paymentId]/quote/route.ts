import { NextResponse } from "next/server";
import { z } from "zod";
import type { AllowedAsset } from "@/lib/assets/types";
import { resolvePaymentForHostedCheckout } from "@/lib/checkout-sessions/service";
import {
  ensurePayablePayment,
  refreshPaymentQuote,
} from "@/lib/payments/quote-service";

const quoteQuerySchema = z.object({
  paid_asset_code: z.string().min(1),
  paid_asset_issuer: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const resolved = await resolvePaymentForHostedCheckout(paymentId);

  if (!resolved) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const payable = await ensurePayablePayment(resolved.payment);

  if (payable.error) {
    return NextResponse.json({ error: payable.error }, { status: 410 });
  }

  const url = new URL(request.url);
  const parsed = quoteQuerySchema.safeParse({
    paid_asset_code: url.searchParams.get("paid_asset_code"),
    paid_asset_issuer: url.searchParams.get("paid_asset_issuer"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid paid asset" }, { status: 400 });
  }

  const paidAsset: AllowedAsset = {
    asset_code: parsed.data.paid_asset_code,
    issuer_address: parsed.data.paid_asset_issuer?.trim() || null,
  };

  try {
    const { quote } = await refreshPaymentQuote(payable.payment, paidAsset);

    return NextResponse.json({
      pricing_amount: quote.pricing_amount,
      pricing_currency: quote.pricing_currency,
      paid_asset: quote.paid_asset,
      paid_amount: quote.paid_amount,
      settlement_asset: quote.settlement_asset,
      settlement_amount: quote.settlement_amount,
      rate: quote.rate,
      settlement_quote_rate: quote.settlement_quote_rate,
      requires_path_payment: quote.requires_path_payment,
      expires_at: quote.expires_at.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to build payment quote",
      },
      { status: 400 }
    );
  }
}
