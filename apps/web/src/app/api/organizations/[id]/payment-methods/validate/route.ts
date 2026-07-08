import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSessionUserId } from "@/lib/auth/session";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import { validateCustomAsset } from "@/lib/payment-methods/service";

const validateSchema = z.object({
  asset_code: z.string().min(1),
  issuer_address: z.string().min(1),
});

export async function POST(
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
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const result = await validateCustomAsset({
      assetCode: parsed.data.asset_code,
      issuerAddress: parsed.data.issuer_address,
      environment: organization.environment,
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      asset_name: result.assetName,
      issuer: result.issuer,
      network: result.network,
    });
  } catch (error) {
    console.error("POST /payment-methods/validate failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to validate asset",
      },
      { status: 500 }
    );
  }
}
