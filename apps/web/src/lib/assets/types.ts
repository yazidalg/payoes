import type { Organization } from "@/lib/db/schema";
import {
  isOfficialAssetCode,
  resolveOfficialIssuer,
} from "@/lib/payment-methods/official-assets";

export type AllowedAsset = {
  asset_code: string;
  issuer_address: string | null;
};

export type AssetConfig = {
  settlement_asset: AllowedAsset;
  allowed_assets: AllowedAsset[];
};

export function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

export function resolveAllowedAsset(
  asset: AllowedAsset,
  environment: Organization["environment"],
): AllowedAsset {
  return {
    asset_code: asset.asset_code,
    issuer_address: resolveComparableIssuer(asset, environment),
  };
}

export function resolveComparableIssuer(
  asset: AllowedAsset,
  environment: Organization["environment"],
): string | null {
  const explicitIssuer = asset.issuer_address?.trim() || null;

  if (explicitIssuer) {
    return explicitIssuer;
  }

  if (asset.asset_code === "XLM") {
    return null;
  }

  if (isOfficialAssetCode(asset.asset_code)) {
    return resolveOfficialIssuer(asset.asset_code, environment);
  }

  return null;
}

export function allowedAssetsEquivalent(
  left: AllowedAsset,
  right: AllowedAsset,
  environment: Organization["environment"],
) {
  if (left.asset_code !== right.asset_code) {
    return false;
  }

  if (left.asset_code === "XLM") {
    return true;
  }

  return (
    resolveComparableIssuer(left, environment) ===
    resolveComparableIssuer(right, environment)
  );
}

export function assetsMatch(
  a: AllowedAsset,
  b: AllowedAsset,
  environment?: Organization["environment"],
) {
  if (a.asset_code !== b.asset_code) {
    return false;
  }

  if (a.asset_code === "XLM") {
    return true;
  }

  if (environment) {
    return allowedAssetsEquivalent(a, b, environment);
  }

  return (
    (a.issuer_address?.trim() || null) === (b.issuer_address?.trim() || null)
  );
}

export function findAllowedAsset(
  allowedAssets: AllowedAsset[],
  assetCode: string,
  issuerAddress?: string | null,
  environment?: Organization["environment"],
) {
  const incoming: AllowedAsset = {
    asset_code: assetCode,
    issuer_address: issuerAddress ?? null,
  };

  return allowedAssets.find((asset) => {
    if (asset.asset_code !== assetCode) {
      return false;
    }

    if (environment) {
      return allowedAssetsEquivalent(asset, incoming, environment);
    }

    return (
      (asset.issuer_address?.trim() || null) ===
      (issuerAddress?.trim() || null)
    );
  });
}

export function serializeAllowedAsset(asset: AllowedAsset) {
  return {
    asset_code: asset.asset_code,
    issuer_address: asset.issuer_address,
  };
}
