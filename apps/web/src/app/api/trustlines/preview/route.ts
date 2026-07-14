import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildChangeTrustTransactionXdr,
  getDefaultRequiredTrustlineAssets,
  getMissingTrustlines,
} from "@/lib/stellar/trustlines";

const previewTrustlineSchema = z.object({
  action: z.enum(["check", "build"]),
  sourcePublicKey: z.string().min(1),
  environment: z.enum(["sandbox", "production"]),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = previewTrustlineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, sourcePublicKey, environment } = parsed.data;

  try {
    const requiredAssets = getDefaultRequiredTrustlineAssets(environment);
    const missing = await getMissingTrustlines(
      sourcePublicKey,
      requiredAssets,
      environment,
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
      environment,
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
      { status: 400 },
    );
  }
}
