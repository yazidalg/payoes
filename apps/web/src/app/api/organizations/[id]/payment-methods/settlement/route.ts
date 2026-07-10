import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSessionUserId } from "@/lib/auth/session";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import {
  serializePaymentMethod,
  setDefaultSettlementMethod,
} from "@/lib/payment-methods/service";

const settlementSchema = z.object({
  method_id: z.string().uuid(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organization = await getOrganizationForMember(id, userId);

    if (!organization) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = settlementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const method = await setDefaultSettlementMethod(
      organization.id,
      parsed.data.method_id
    );

    return NextResponse.json({
      payment_method: serializePaymentMethod(method),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update settlement asset",
      },
      { status: 400 }
    );
  }
}
