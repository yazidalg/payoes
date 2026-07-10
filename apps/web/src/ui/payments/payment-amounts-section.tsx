import type { ReactNode } from "react";
import type { PaymentRow } from "@/lib/payments/types";
import { formatAssetRef } from "@/lib/payments/types";
import { CopyText } from "@dub/ui";
import {
  formatAllowedAssets,
  formatInvoiceTotal,
  formatPaidAmount,
  formatPaidAsset,
  formatSettlementAmount,
  formatSettlementTarget,
} from "./payment-formatters";

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <div className="mt-1 text-sm text-neutral-900">{children}</div>
    </div>
  );
}

export function PaymentAmountsSection({ payment }: { payment: PaymentRow }) {
  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
      <div className="border-border-subtle border-b px-4 py-3">
        <h2 className="text-content-emphasis text-sm font-semibold">Payment details</h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          Amounts, assets, and settlement metadata.
        </p>
      </div>

      <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <DetailField label="Invoice total">{formatInvoiceTotal(payment)}</DetailField>
          <DetailField label="Paid amount">{formatPaidAmount(payment)}</DetailField>
          <DetailField label="Settlement target">
            {formatSettlementTarget(payment)}
          </DetailField>
          <DetailField label="Settlement amount">
            {formatSettlementAmount(payment)}
          </DetailField>
          <DetailField label="Settlement asset">
            {formatAssetRef(payment.settlement_asset)}
          </DetailField>
          <DetailField label="Paid asset">{formatPaidAsset(payment)}</DetailField>
          <DetailField label="Allowed assets">{formatAllowedAssets(payment)}</DetailField>
          {payment.payer_address ? (
            <DetailField label="Payer wallet">
              <CopyText
                value={payment.payer_address}
                className="font-mono text-xs"
              >
                {payment.payer_address}
              </CopyText>
            </DetailField>
          ) : null}
          {payment.tx_hash ? (
            <DetailField label="Transaction hash">
              <CopyText value={payment.tx_hash} className="font-mono text-xs">
                {payment.tx_hash}
              </CopyText>
            </DetailField>
          ) : null}
        </div>
      </div>
    </div>
  );
}
