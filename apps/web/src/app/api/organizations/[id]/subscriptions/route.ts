import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSubscription,
  getSubscriptionDetail,
  listSubscriptions,
  serializeSubscription,
  serializeSubscriptions,
} from "@/lib/subscriptions/service";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import { getOrganizationForMember } from "@/lib/organizations/wallet";

const createSubscriptionSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a valid Stellar amount"),
  asset: z.enum(ACCEPTED_ASSET_OPTIONS),
  customer_id: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  interval: z.enum(["month", "year"]).optional(),
  interval_count: z.number().int().min(1).max(12).optional(),
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

  const rows = await listSubscriptions(organization.id);

  return NextResponse.json({
    subscriptions: serializeSubscriptions(rows),
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
  const parsed = createSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const subscription = await createSubscription({
      organizationId: organization.id,
      environment: organization.environment,
      customerId: parsed.data.customer_id,
      amount: parsed.data.amount,
      asset: parsed.data.asset,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      interval: parsed.data.interval,
      intervalCount: parsed.data.interval_count,
    });

    const detail = await getSubscriptionDetail(
      subscription.publicId,
      organization.id
    );

    if (!detail) {
      return NextResponse.json(
        { error: "Unable to load created subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      serializeSubscription({
        ...detail.subscription,
        customerPublicId: detail.customerPublicId,
      }),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create subscription",
      },
      { status: 400 }
    );
  }
}
