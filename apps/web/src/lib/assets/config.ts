import type { Organization } from "@/lib/db/schema";
import {
  getDefaultSettlementMethod,
  listEnabledPaymentMethods,
  type PaymentMethod,
} from "@/lib/payment-methods/service";
import type { AllowedAsset, AssetConfig } from "@/lib/assets/types";

function methodToAllowedAsset(method: PaymentMethod): AllowedAsset {
  return {
    asset_code: method.assetCode,
    issuer_address: method.issuerAddress,
  };
}

export async function getOrganizationDefaultAssetConfig(
  organizationId: string
): Promise<AssetConfig> {
  const enabled = await listEnabledPaymentMethods(organizationId);
  const defaultMethod = await getDefaultSettlementMethod(organizationId);

  if (enabled.length === 0) {
    throw new Error("No enabled assets. Configure assets in Settings → Assets.");
  }

  const settlementMethod =
    defaultMethod && defaultMethod.isEnabled
      ? defaultMethod
      : enabled[0];

  return {
    settlement_asset: methodToAllowedAsset(settlementMethod),
    allowed_assets: enabled.map(methodToAllowedAsset),
  };
}

export async function resolveAssetConfig(input: {
  organizationId: string;
  settlementAsset?: AllowedAsset | null;
  allowedAssets?: AllowedAsset[] | null;
}): Promise<AssetConfig> {
  const enabled = await listEnabledPaymentMethods(input.organizationId);
  const enabledKeys = new Set(
    enabled.map((m) => `${m.assetCode}:${m.issuerAddress ?? ""}`)
  );

  if (enabled.length === 0) {
    throw new Error("No enabled assets. Configure assets in Settings → Assets.");
  }

  const defaults = await getOrganizationDefaultAssetConfig(input.organizationId);

  const settlement = input.settlementAsset ?? defaults.settlement_asset;
  const settlementKey = `${settlement.asset_code}:${settlement.issuer_address ?? ""}`;

  if (!enabledKeys.has(settlementKey)) {
    throw new Error("Settlement asset is not enabled for this organization");
  }

  const allowed = input.allowedAssets?.length
    ? input.allowedAssets
    : defaults.allowed_assets;

  if (allowed.length === 0) {
    throw new Error("At least one allowed asset is required");
  }

  for (const asset of allowed) {
    const key = `${asset.asset_code}:${asset.issuer_address ?? ""}`;
    if (!enabledKeys.has(key)) {
      throw new Error(`Asset ${asset.asset_code} is not enabled for this organization`);
    }
  }

  if (!allowed.some((a) => assetsMatch(a, settlement))) {
    throw new Error("Settlement asset must be included in allowed assets");
  }

  return {
    settlement_asset: settlement,
    allowed_assets: allowed,
  };
}

function assetsMatch(a: AllowedAsset, b: AllowedAsset) {
  return (
    a.asset_code === b.asset_code &&
    (a.issuer_address?.trim() || null) === (b.issuer_address?.trim() || null)
  );
}

export function toPaymentAssetInput(asset: AllowedAsset) {
  return {
    assetCode: asset.asset_code,
    issuerAddress: asset.issuer_address,
  };
}

export function formatAssetLabel(asset: AllowedAsset) {
  return asset.asset_code;
}
