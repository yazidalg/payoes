"use client";

import { formatAssetAmount, type PaymentRow } from "@/lib/payments/types";
import { AssetIcon } from "@/ui/assets/asset-icon";
import {
  getPaidAmountValue,
  getPaidAsset,
  paymentHasReceivedFunds,
} from "@/ui/payments/payment-formatters";

export function PaidAmountCell({ payment }: { payment: PaymentRow }) {
  if (!paymentHasReceivedFunds(payment)) {
    return "-";
  }

  const asset = getPaidAsset(payment);
  const amount = getPaidAmountValue(payment);

  return (
    <span className="flex items-center gap-2">
      <AssetIcon assetCode={asset.asset_code} className="size-5" />
      <span className="truncate">
        {formatAssetAmount(amount, asset)}
      </span>
    </span>
  );
}
