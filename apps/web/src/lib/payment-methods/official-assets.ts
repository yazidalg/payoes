import type { Organization } from "@/lib/db/schema";
import { getOfficialAssetIssuer } from "@/lib/stellar/env";
import type { OfficialIssuerAssetCode } from "@/lib/payment-methods/official-issuer-registry";

export type OfficialAssetCode = "XLM" | OfficialIssuerAssetCode;

export type OfficialAssetDefinition = {
  code: OfficialAssetCode;
  displayName: string;
  description: string;
  issuedBy: string | null;
  isNative: boolean;
};

export const OFFICIAL_ASSETS: OfficialAssetDefinition[] = [
  {
    code: "USDC",
    displayName: "USDC",
    description: "Official Circle USD stablecoin",
    issuedBy: "Circle",
    isNative: false,
  },
  {
    code: "XLM",
    displayName: "XLM",
    description: "Native Stellar asset",
    issuedBy: null,
    isNative: true,
  },
  {
    code: "EURC",
    displayName: "EURC",
    description: "Official Circle euro stablecoin",
    issuedBy: "Circle",
    isNative: false,
  },
  {
    code: "PYUSD",
    displayName: "PYUSD",
    description: "Official PayPal USD stablecoin",
    issuedBy: "Paxos",
    isNative: false,
  },
  {
    code: "AUDD",
    displayName: "AUDD",
    description: "Official Australian dollar stablecoin",
    issuedBy: "AUDC Pty Ltd",
    isNative: false,
  },
  {
    code: "NGNC",
    displayName: "NGNC",
    description: "Official Nigerian naira stablecoin",
    issuedBy: "LINK.IO",
    isNative: false,
  },
];

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
