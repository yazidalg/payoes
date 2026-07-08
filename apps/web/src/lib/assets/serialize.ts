import type { Payment, PaymentLink } from "@/lib/db/schema";
import type { AllowedAsset } from "@/lib/assets/types";
import { serializeAllowedAsset } from "@/lib/assets/types";

export function paymentAllowedAssets(payment: Payment): AllowedAsset[] {
  return payment.allowedAssets ?? [];
}

export function serializePaymentAssets(payment: Payment) {
  return {
    settlement_asset: {
      asset_code: payment.settlementAsset,
      issuer_address: payment.settlementAssetIssuer,
    },
    allowed_assets: paymentAllowedAssets(payment).map(serializeAllowedAsset),
    paid_asset: payment.paidAsset
      ? {
          asset_code: payment.paidAsset,
          issuer_address: payment.paidAssetIssuer,
        }
      : null,
  };
}

export function serializePaymentLinkAssets(link: PaymentLink) {
  return {
    settlement_asset: {
      asset_code: link.settlementAsset,
      issuer_address: link.settlementAssetIssuer,
    },
    allowed_assets: (link.allowedAssets ?? []).map(serializeAllowedAsset),
  };
}

export function dbAllowedAssets(assets: AllowedAsset[]) {
  return assets.map((asset) => ({
    asset_code: asset.asset_code,
    issuer_address: asset.issuer_address?.trim() || null,
  }));
}
