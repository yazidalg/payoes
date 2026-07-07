import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCheckoutSession,
  listCheckoutSessions,
  serializeCheckoutSession,
} from "@/lib/checkout-sessions/service";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const createCheckoutSessionSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  asset: z.enum(ACCEPTED_ASSET_OPTIONS),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  expires_in_minutes: z.number().int().min(5).max(10080).optional(),
  customer_id: z.string().optional().nullable(),
  success_url: z.string().url().optional().nullable(),
  cancel_url: z.string().url().optional().nullable(),
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

  const sessions = await listCheckoutSessions(organization.id);

  return NextResponse.json({
    checkout_sessions: sessions.map((row) => serializeCheckoutSession(row)),
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
  const parsed = createCheckoutSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const { session: checkoutSession, payment } = await createCheckoutSession({
      organizationId: organization.id,
      environment: organization.environment,
      amount: parsed.data.amount,
      asset: parsed.data.asset,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      expiresInMinutes: parsed.data.expires_in_minutes,
      customerId: parsed.data.customer_id,
      successUrl: parsed.data.success_url,
      cancelUrl: parsed.data.cancel_url,
    });

    return NextResponse.json(
      serializeCheckoutSession(checkoutSession, {
        paymentPublicId: payment.publicId,
      }),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create checkout session",
      },
      { status: 400 }
    );
  }
}
