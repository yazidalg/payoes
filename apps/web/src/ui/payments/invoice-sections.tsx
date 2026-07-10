import type { InvoiceRow } from "@/lib/payments/types";
import { formatAmountWithUnit } from "@/lib/format/amount";
import { TimestampTooltip } from "@dub/ui";
import { DetailField } from "@/ui/shared/detail-field";
import { DetailSection } from "@/ui/shared/detail-section";

function formatDetailTimestamp(value: string | null) {
  if (!value) {
    return "-";
  }

  return (
    <TimestampTooltip timestamp={value} rows={["local", "utc"]} side="left">
      <span>
        {new Date(value).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </TimestampTooltip>
  );
}

export function InvoiceLineItemsSection({ invoice }: { invoice: InvoiceRow }) {
  return (
    <DetailSection
      title="Summary"
      description="Line items and invoice totals."
      contentClassName="p-0"
    >
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500">
                Description
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500">Qty</th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500">
                Unit price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                  {invoice.description ?? "No line items"}
                </td>
              </tr>
            ) : (
              invoice.items.map((item) => {
                const lineTotal =
                  Number(item.unit_amount) * Number(item.quantity || "1");

                return (
                  <tr key={`${item.description}-${item.unit_amount}`} className="border-t">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">
                      {formatAmountWithUnit(item.unit_amount, invoice.currency_code)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatAmountWithUnit(
                        Number.isFinite(lineTotal) ? String(lineTotal) : item.unit_amount,
                        invoice.currency_code,
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-4 text-sm">
        <span className="font-medium">Total</span>
        <span className="text-content-emphasis text-lg font-semibold">
          {formatAmountWithUnit(invoice.amount, invoice.currency_code)}
        </span>
      </div>
    </DetailSection>
  );
}

export function InvoiceMetadataSection({ invoice }: { invoice: InvoiceRow }) {
  return (
    <DetailSection
      title="Details"
      description="Billing metadata and linked resources."
      contentClassName="p-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <DetailField label="Memo">{invoice.description ?? "-"}</DetailField>
        <DetailField label="Currency">{invoice.currency_code}</DetailField>
        <DetailField label="Created">{formatDetailTimestamp(invoice.created_at)}</DetailField>
        <DetailField label="Due">{formatDetailTimestamp(invoice.due_at)}</DetailField>
        <DetailField label="Sent">{formatDetailTimestamp(invoice.sent_at)}</DetailField>
        <DetailField label="Paid">{formatDetailTimestamp(invoice.paid_at)}</DetailField>
      </div>
    </DetailSection>
  );
}

export function InvoiceActivitySection({ invoice }: { invoice: InvoiceRow }) {
  return (
    <DetailSection
      title="Recent activity"
      description="Invoice lifecycle events."
      contentClassName="p-6"
    >
      {invoice.activity.length === 0 ? (
        <p className="text-sm text-neutral-500">No activity yet.</p>
      ) : (
        <ol className="space-y-4">
          {invoice.activity.map((event) => (
            <li key={`${event.id}-${event.at}`} className="relative pl-4">
              <span className="absolute left-0 top-2 size-2 rounded-full bg-neutral-400" />
              <p className="text-sm text-neutral-900">{event.label}</p>
              <p className="mt-1 text-xs text-neutral-500">{event.at}</p>
            </li>
          ))}
        </ol>
      )}
    </DetailSection>
  );
}
