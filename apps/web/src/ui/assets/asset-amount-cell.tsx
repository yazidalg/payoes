"use client";

import {
  formatAssetAmount,
  type AllowedAssetRef,
} from "@/lib/payments/types";
import { AssetIcon } from "@/ui/assets/asset-icon";

export function AssetAmountCell({
  amount,
  asset,
}: {
  amount: string | number | null | undefined;
  asset: AllowedAssetRef | null | undefined;
}) {
  return (
    <span className="flex items-center gap-2">
      <AssetIcon assetCode={asset?.asset_code ?? "UNKNOWN"} className="size-5" />
      <span className="truncate">{formatAssetAmount(amount, asset)}</span>
    </span>
  );
}
