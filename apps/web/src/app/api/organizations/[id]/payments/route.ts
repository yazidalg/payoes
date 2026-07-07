import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import {
  createPayment,
  listPayments,
  serializePayments,
} from "@/lib/payments/service";

const createPaymentSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  asset: z.enum(ACCEPTED_ASSET_OPTIONS),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  expires_in_minutes: z.number().int().min(5).max(10080).optional(),
  customer_id: z.string().optional().nullable(),
});

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
  const parsed = createPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const payment = await createPayment({
      organizationId: organization.id,
      environment: organization.environment,
      amount: parsed.data.amount,
      asset: parsed.data.asset,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      expiresInMinutes: parsed.data.expires_in_minutes,
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
