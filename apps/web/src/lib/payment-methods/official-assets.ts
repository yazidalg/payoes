import type { Organization } from "@/lib/db/schema";
import {
  OFFICIAL_ASSETS,
  type OfficialAssetCode,
  type OfficialAssetDefinition,
} from "@/constants/assets/official";
import { getOfficialAssetIssuer } from "@/lib/stellar/env";
import type { OfficialIssuerAssetCode } from "@/constants/assets/issuers";

export type { OfficialAssetCode, OfficialAssetDefinition };
export { OFFICIAL_ASSETS };

export function isOfficialAssetCode(code: string): code is OfficialAssetCode {
  return OFFICIAL_ASSETS.some((asset) => asset.code === code);
}

export function getOfficialAsset(code: string) {
  return OFFICIAL_ASSETS.find((asset) => asset.code === code) ?? null;
}

export function isOfficialAssetAvailable(
  code: OfficialAssetCode,
  environment: Organization["environment"]
) {
  const asset = getOfficialAsset(code);

  if (!asset) {
    return false;
  }

  if (asset.isNative) {
    return true;
  }

  return getOfficialAssetIssuer(code as OfficialIssuerAssetCode, environment) !== null;
}

export function resolveOfficialIssuer(
  code: OfficialAssetCode,
  environment: Organization["environment"]
): string | null {
  if (code === "XLM") {
    return null;
  }

  return getOfficialAssetIssuer(code, environment);
}

export function getOfficialAssetSubtitle(code: string) {
  const asset = getOfficialAsset(code);

  if (!asset) {
    return null;
  }

  if (asset.isNative) {
    return "Native Asset";
  }

  return asset.issuedBy ? `Issued by ${asset.issuedBy}` : null;
}
