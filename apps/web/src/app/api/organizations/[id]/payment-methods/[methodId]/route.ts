import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSessionUserId } from "@/lib/auth/session";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import {
  removePaymentMethod,
  serializePaymentMethod,
  updatePaymentMethod,
} from "@/lib/payment-methods/service";

const updateSchema = z.object({
  is_enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; methodId: string }> }
) {
  try {
    const session = await auth();
    const userId = await resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, methodId } = await params;
    const organization = await getOrganizationForMember(id, userId);

    if (!organization) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const method = await updatePaymentMethod(organization.id, methodId, {
      isEnabled: parsed.data.is_enabled,
    });

    return NextResponse.json({
      payment_method: serializePaymentMethod(method),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update payment method",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; methodId: string }> }
) {
  try {
    const session = await auth();
    const userId = await resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, methodId } = await params;
    const organization = await getOrganizationForMember(id, userId);

    if (!organization) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await removePaymentMethod(organization.id, methodId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to remove payment method",
      },
      { status: 400 }
    );
  }
}
