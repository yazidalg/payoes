import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPublicPaymentLinkDetail,
  startCheckoutFromPaymentLink,
} from "@/lib/payment-links/service";
import { paymentLinkCustomerInputSchema } from "@/lib/payment-links/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;
  const link = await getPublicPaymentLinkDetail(linkId);

  if (!link) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  return NextResponse.json(link);
}

const checkoutBodySchema = z.object({
  customer: paymentLinkCustomerInputSchema.optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = checkoutBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const result = await startCheckoutFromPaymentLink(
      linkId,
      parsed.data.customer ?? undefined
    );

    if (!result) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    return NextResponse.json({
      checkout_url: result.checkoutUrl,
      payment_id: result.payment.publicId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start checkout from payment link",
      },
      { status: 400 }
    );
  }
}
