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

export function assetsMatch(
  a: AllowedAsset,
  b: AllowedAsset
) {
  return (
    a.asset_code === b.asset_code &&
    (a.issuer_address?.trim() || null) === (b.issuer_address?.trim() || null)
  );
}

export function findAllowedAsset(
  allowedAssets: AllowedAsset[],
  assetCode: string,
  issuerAddress?: string | null
) {
  const normalizedIssuer = issuerAddress?.trim() || null;

  return allowedAssets.find((asset) => {
    if (asset.asset_code !== assetCode) {
      return false;
    }

    return (asset.issuer_address?.trim() || null) === normalizedIssuer;
  });
}

export function serializeAllowedAsset(asset: AllowedAsset) {
  return {
    asset_code: asset.asset_code,
    issuer_address: asset.issuer_address,
  };
}
