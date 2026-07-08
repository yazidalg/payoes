import { Asset } from "@stellar/stellar-sdk";
import type { Organization } from "@/lib/db/schema";
import { getHorizonUrl } from "@/lib/stellar/network";
import { isValidStellarAddress } from "@/lib/stellar/validate-address";

const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export function isValidAssetCode(code: string) {
  return ASSET_CODE_PATTERN.test(code);
}

export async function validateCustomAssetOnHorizon(input: {
  assetCode: string;
  issuerAddress: string;
  environment: Organization["environment"];
}) {
  if (!isValidAssetCode(input.assetCode)) {
    return { valid: false as const, error: "Asset code must be 1–12 alphanumeric characters" };
  }

  if (!isValidStellarAddress(input.issuerAddress)) {
    return { valid: false as const, error: "Issuer address must be a valid Stellar public key" };
  }

  const asset = new Asset(input.assetCode, input.issuerAddress);

  try {
    asset.toXDRObject();
  } catch {
    return { valid: false as const, error: "Invalid asset code or issuer combination" };
  }

  const horizonUrl = getHorizonUrl(input.environment);
  const response = await fetch(
    `${horizonUrl}/assets?asset_code=${encodeURIComponent(input.assetCode)}&asset_issuer=${encodeURIComponent(input.issuerAddress)}`,
    { next: { revalidate: 0 } }
  );

  if (!response.ok) {
    return {
      valid: false as const,
      error: "Unable to validate asset on Horizon. Try again later.",
    };
  }

  const payload = (await response.json()) as {
    _embedded?: { records?: Array<{ asset_code?: string; asset_issuer?: string }> };
  };

  const record = payload._embedded?.records?.[0];

  if (!record) {
    return { valid: false as const, error: "Asset not found on this network" };
  }

  return {
    valid: true as const,
    assetName: input.assetCode,
    issuer: input.issuerAddress,
    network: input.environment === "production" ? "Mainnet" : "Testnet",
  };
}
