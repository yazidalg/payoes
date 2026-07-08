import { z } from "zod";
import { isValidAssetCode } from "@/lib/stellar/validate-asset";
import { resolveAssetConfig } from "@/lib/assets/config";
import type { AllowedAsset } from "@/lib/assets/types";

const allowedAssetSchema = z.object({
  asset_code: z
    .string()
    .min(1)
    .refine((value) => value === "XLM" || isValidAssetCode(value), {
      message: "Asset code must be 1–12 alphanumeric characters",
    }),
  issuer_address: z.string().nullable().optional(),
});

export const assetConfigFields = {
  settlement_asset: allowedAssetSchema,
  allowed_assets: z.array(allowedAssetSchema).min(1, "Select at least one allowed asset"),
};

export const optionalAssetConfigFields = {
  settlement_asset: allowedAssetSchema.optional().nullable(),
  allowed_assets: z.array(allowedAssetSchema).optional().nullable(),
};

export async function parseAndResolveAssetConfig(
  organizationId: string,
  body: {
    settlement_asset?: {
      asset_code: string;
      issuer_address?: string | null;
    } | null;
    allowed_assets?: Array<{
      asset_code: string;
      issuer_address?: string | null;
    }> | null;
  }
) {
  const settlementParsed = body.settlement_asset
    ? allowedAssetSchema.safeParse(body.settlement_asset)
    : { success: true as const, data: null };

  if (!settlementParsed.success) {
    throw new Error(settlementParsed.error.issues[0]?.message ?? "Invalid settlement asset");
  }

  const allowedParsed = body.allowed_assets
    ? z.array(allowedAssetSchema).min(1).safeParse(body.allowed_assets)
    : { success: true as const, data: null };

  if (!allowedParsed.success) {
    throw new Error(allowedParsed.error.issues[0]?.message ?? "Invalid allowed assets");
  }

  return resolveAssetConfig({
    organizationId,
    settlementAsset: settlementParsed.data
      ? {
          asset_code: settlementParsed.data.asset_code,
          issuer_address: settlementParsed.data.issuer_address ?? null,
        }
      : null,
    allowedAssets: allowedParsed.data
      ? allowedParsed.data.map((asset) => ({
          asset_code: asset.asset_code,
          issuer_address: asset.issuer_address ?? null,
        }))
      : null,
  });
}
