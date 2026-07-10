import type { CheckoutSessionRow } from "@/lib/payments/types";
import { formatAssetRef } from "@/lib/payments/types";
import { CopyText } from "@dub/ui";
import { DetailField } from "@/ui/shared/detail-field";
import { DetailSection } from "@/ui/shared/detail-section";

export function CheckoutSessionDetailsSection({
  session,
}: {
  session: CheckoutSessionRow;
}) {
  const allowedAssets =
    session.allowed_assets.map((asset) => asset.asset_code).join(", ") || "-";

  return (
    <DetailSection
      title="Session details"
      description="Status, assets, and redirect URLs."
      contentClassName="p-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <DetailField label="Session status">
          <span className="capitalize">{session.status}</span>
        </DetailField>
        <DetailField label="Payment status">
          <span className="capitalize">{session.payment_status ?? "-"}</span>
        </DetailField>
        <DetailField label="Settlement asset">
          {formatAssetRef(session.settlement_asset)}
        </DetailField>
        <DetailField label="Paid asset">
          {formatAssetRef(session.paid_asset)}
        </DetailField>
        <DetailField label="Allowed assets">{allowedAssets}</DetailField>
        {session.success_url ? (
          <DetailField label="Success URL">
            <CopyText value={session.success_url} className="break-all font-mono text-xs">
              {session.success_url}
            </CopyText>
          </DetailField>
        ) : null}
        {session.cancel_url ? (
          <DetailField label="Cancel URL">
            <CopyText value={session.cancel_url} className="break-all font-mono text-xs">
              {session.cancel_url}
            </CopyText>
          </DetailField>
        ) : null}
      </div>
    </DetailSection>
  );
}
