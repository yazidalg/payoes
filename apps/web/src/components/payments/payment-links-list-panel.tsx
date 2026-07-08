"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAssetAmount, type PaymentLinkRow } from "@/lib/payments/types";
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
      `/api/organizations/${organizationId}/payment-links`
    );
    const data = (await response.json()) as { payment_links?: PaymentLinkRow[] };
    return data.payment_links ?? [];
  }, [organizationId]);

  const { data: links } = useAsyncData(fetchLinks, [organizationId, reloadKey]);

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Payment link copied");
  }

  return (
    <Card>
      {!embedded ? (
        <CardHeader>
          <CardTitle>Link list</CardTitle>
          <CardDescription>Click a link ID to open the detail page.</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className="px-0 pb-0">
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {(links ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No payment links yet.
                  </td>
                </tr>
              ) : (
                (links ?? []).map((link) => (
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
                      {formatAssetAmount(link.amount, link.settlement_asset)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
