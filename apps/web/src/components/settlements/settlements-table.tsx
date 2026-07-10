"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAmountWithUnit } from "@/lib/format/amount";
import { formatAssetAmount, type SettlementConversionRow } from "@/lib/payments/types";
import type { Organization } from "@/lib/db/schema";
import { getStellarExpertTxUrl } from "@/lib/stellar/explorer";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { CircleDollarOut } from "@dub/ui/icons";

export function SettlementsTable({
  organizationId,
  environment,
}: {
  organizationId: string;
  environment: Organization["environment"];
}) {
  const fetchSettlements = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/settlements`);
    const data = (await response.json()) as {
      settlements?: SettlementConversionRow[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load settlements");
    }

    return data.settlements ?? [];
  }, [organizationId]);

  const { data: settlements, error, isLoading } = useAsyncData(fetchSettlements, [
    organizationId,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settlements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-asset invoice payments converted into your settlement asset on-chain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion history</CardTitle>
          <CardDescription>
            Payments where the customer paid with one asset and settlement targeted another.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">Loading settlements...</p>
          ) : error ? (
            <p className="px-4 py-8 text-sm text-destructive">{error}</p>
          ) : (settlements ?? []).length === 0 ? (
            <TableEmptyState
              title="No settlement conversions yet"
              description="Cross-asset invoice payments converted into your settlement asset will appear here."
              icon={<CircleDollarOut className="size-4 text-neutral-700" />}
              className="border-0"
            />
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Received</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Tx</th>
                    <th className="px-4 py-3 font-medium">Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {(settlements ?? []).map((row) => (
                      <tr key={row.payment_id} className="border-t border-border/60">
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link
                            href={`/dashboard/payments/${row.payment_id}`}
                            className="hover:underline"
                          >
                            {row.payment_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {formatAssetAmount(
                            row.quoted_paid_amount,
                            row.paid_asset
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatAssetAmount(
                            row.quoted_settlement_amount,
                            row.settlement_asset
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.pricing_amount && row.pricing_currency
                            ? formatAmountWithUnit(
                                row.pricing_amount,
                                row.pricing_currency
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.converted_on_chain ? "Path payment" : "Direct receive"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.tx_hash ? (
                            <a
                              href={getStellarExpertTxUrl(row.tx_hash, environment)}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {row.tx_hash.slice(0, 8)}...
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.confirmed_at
                            ? new Date(row.confirmed_at).toLocaleString()
                            : "N/A"}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
