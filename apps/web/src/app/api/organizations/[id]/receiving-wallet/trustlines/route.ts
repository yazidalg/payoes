import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrganizationForMember } from "@/lib/organizations/wallet";
import {
  buildChangeTrustTransactionXdr,
  getMissingTrustlines,
  getRequiredTrustlineAssets,
} from "@/lib/stellar/trustlines";

const trustlineSchema = z.object({
  action: z.enum(["check", "build"]),
  sourcePublicKey: z.string().min(1),
});

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
  const parsed = trustlineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, sourcePublicKey } = parsed.data;

  try {
    const requiredAssets = await getRequiredTrustlineAssets(
      organization.id,
      organization.environment
    );
    const missing = await getMissingTrustlines(
      sourcePublicKey,
      requiredAssets,
      organization.environment
    );

    if (action === "check") {
      return NextResponse.json({
        missing: missing.map((asset) => ({
          asset_code: asset.asset_code,
          issuer_address: asset.issuer_address,
          display_name: asset.display_name,
        })),
        has_missing: missing.length > 0,
      });
    }

    if (missing.length === 0) {
      return NextResponse.json({
        xdr: null,
        has_missing: false,
      });
    }

    const xdr = await buildChangeTrustTransactionXdr({
      sourcePublicKey,
      assets: missing,
      environment: organization.environment,
    });

    return NextResponse.json({
      xdr,
      has_missing: true,
      missing_count: missing.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to prepare trustlines",
      },
      { status: 400 }
    );
  }
}
