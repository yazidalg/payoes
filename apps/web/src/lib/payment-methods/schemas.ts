import { z } from "zod";
import { isValidAssetCode } from "@/lib/stellar/validate-asset";

export const stellarAssetCodeField = z
  .string()
  .min(1, "Asset is required")
  .refine((value) => value === "XLM" || isValidAssetCode(value), {
    message: "Asset code must be 1–12 alphanumeric characters",
  });

export const optionalAssetIssuerField = z.string().optional().nullable();

export const allowedAssetSchema = z.object({
  asset_code: stellarAssetCodeField,
  issuer_address: optionalAssetIssuerField,
});

/** @deprecated Use paymentAssetConfigFields */
export const paymentAssetFields = {
  asset: stellarAssetCodeField,
  asset_issuer: optionalAssetIssuerField,
};

export const paymentAssetConfigFields = {
  settlement_asset: allowedAssetSchema.optional(),
  allowed_assets: z.array(allowedAssetSchema).min(1).optional(),
};
