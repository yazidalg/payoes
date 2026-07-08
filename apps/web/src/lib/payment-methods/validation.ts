import { z } from "zod";
import { isValidAssetCode } from "@/lib/stellar/validate-asset";
import {
  assertEnabledPaymentMethod,
  listEnabledPaymentMethods,
} from "@/lib/payment-methods/service";

export const paymentAssetBodySchema = z.object({
  asset: z
    .string()
    .min(1, "Asset is required")
    .refine((value) => isValidAssetCode(value) || value === "XLM", {
      message: "Asset code must be 1–12 alphanumeric characters",
    }),
  asset_issuer: z.string().optional().nullable(),
});

export async function validateOrganizationPaymentAsset(
  organizationId: string,
  asset: string,
  assetIssuer?: string | null
) {
  const methods = await listEnabledPaymentMethods(organizationId);
  const normalizedIssuer = assetIssuer?.trim() || null;

  const match = methods.find((method) => {
    if (method.assetCode !== asset) {
      return false;
    }

    const methodIssuer = method.issuerAddress?.trim() || null;

    if (normalizedIssuer) {
      return methodIssuer === normalizedIssuer;
    }

    return methodIssuer === null;
  });

  if (!match) {
    const enabledCodes = methods.map((method) => method.assetCode).join(", ");
    throw new Error(
      enabledCodes
        ? `Asset ${asset} is not enabled. Enabled assets: ${enabledCodes}`
        : `Asset ${asset} is not enabled`
    );
  }

  return {
    assetCode: match.assetCode,
    assetIssuer: match.issuerAddress,
    method: match,
  };
}

export async function parseAndValidatePaymentAsset(
  organizationId: string,
  body: unknown
) {
  const parsed = paymentAssetBodySchema.safeParse(body);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid asset");
  }

  const validated = await validateOrganizationPaymentAsset(
    organizationId,
    parsed.data.asset,
    parsed.data.asset_issuer
  );

  await assertEnabledPaymentMethod(
    organizationId,
    validated.assetCode,
    validated.assetIssuer
  );

  return validated;
}
