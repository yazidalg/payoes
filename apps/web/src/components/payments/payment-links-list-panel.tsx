"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import type { PaymentLinkRow } from "@/lib/payments/types";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { Hyperlink } from "@dub/ui/icons";
import { toast } from "sonner";

type PaymentLinksListPanelProps = {
  organizationId: string;
  embedded?: boolean;
  reloadKey?: number;
};

export function PaymentLinksListPanel({
  organizationId,
  embedded = false,
  reloadKey = 0,
}: PaymentLinksListPanelProps) {
  const fetchLinks = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-links`,
    );
    const data = (await response.json()) as { payment_links?: PaymentLinkRow[] };
    return data.payment_links ?? [];
  }, [organizationId]);

  const { data: links } = useAsyncData(fetchLinks, [organizationId, reloadKey]);

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Payment link copied");
  }

  const content =
    (links ?? []).length === 0 ? (
      <TableEmptyState
        title="No payment links yet"
        description="Payment links you create will appear here."
        icon={<Hyperlink className="size-4 text-neutral-700" />}
        className={embedded ? "border-0" : undefined}
      />
    ) : (
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {(links ?? []).map((link) => (
              <tr key={link.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/dashboard/payments/links/${link.id}`}
                    className="font-medium hover:underline"
                  >
                    {link.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {link.items?.length
                    ? `${link.items.length} product${link.items.length === 1 ? "" : "s"}`
                    : (link.product_name ?? "-")}
                </td>
                <td className="px-4 py-3">
                  {link.currency_code
                    ? formatAmountWithUnit(link.amount, link.currency_code)
                    : formatAmountWithUnit(
                        link.amount,
                        link.settlement_asset.asset_code,
                      )}
                </td>
                <td className="px-4 py-3">
                  {link.active ? "Active" : "Inactive"}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyLink(link.url)}
                  >
                    Copy link
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  if (embedded) {
    return content;
  }

  return <div className="space-y-4">{content}</div>;
}
