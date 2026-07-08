import { Asset } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import {
  isOfficialAssetCode,
  resolveOfficialIssuer,
} from "@/lib/payment-methods/official-assets";

export type PaymentAssetInput = {
  assetCode: string;
  issuerAddress?: string | null;
};

export function resolveStellarAsset(
  input: PaymentAssetInput,
  environment: Organization["environment"]
) {
  if (input.assetCode === "XLM") {
    return Asset.native();
  }

  const issuer =
    input.issuerAddress ??
    (isOfficialAssetCode(input.assetCode)
      ? resolveOfficialIssuer(input.assetCode, environment)
      : null);

  if (!issuer) {
    throw new Error(`Issuer is required for asset ${input.assetCode}`);
  }

  return new Asset(input.assetCode, issuer);
}

export function getAssetIdentifier(
  input: PaymentAssetInput,
  environment: Organization["environment"]
) {
  const asset = resolveStellarAsset(input, environment);

  if (asset.isNative()) {
    return "native";
  }

  return `${asset.code}:${asset.issuer}`;
}
