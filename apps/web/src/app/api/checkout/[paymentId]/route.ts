import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { confirmPaymentWithTxHash } from "@/lib/payments/verify";
import { getPaymentByPublicId } from "@/lib/payments/service";
import { buildPaymentTransactionXdr } from "@/lib/stellar/payments";

const confirmSchema = z.object({
  txHash: z.string().min(1),
});

const buildTxSchema = z.object({
  sourcePublicKey: z.string().min(1),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const payment = await getPaymentByPublicId(paymentId);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

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
      asset: payment.asset,
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
  const payment = await getPaymentByPublicId(paymentId);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const body = await request.json();

  if (body.action === "build_transaction") {
    const parsed = buildTxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      const xdr = await buildPaymentTransactionXdr({
        sourcePublicKey: parsed.data.sourcePublicKey,
        destinationPublicKey: payment.receivingAddress,
        amount: payment.amount,
        asset: payment.asset,
        environment: payment.environment,
        memo: payment.memo,
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

  const result = await confirmPaymentWithTxHash(paymentId, parsed.data.txHash);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    status: result.payment.status,
    tx_hash: result.payment.txHash,
  });
}
