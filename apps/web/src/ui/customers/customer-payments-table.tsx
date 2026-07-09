"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { CustomerPaymentRow } from "@/lib/customers/types";
import { formatAssetAmount } from "@/lib/payments/types";
import {
  CopyText,
  EmptyState,
  StatusBadge,
  Table,
  TimestampTooltip,
  useTable,
} from "@dub/ui";
import { CreditCard } from "@dub/ui/icons";
import { formatDateTimeSmart } from "@dub/utils";
function getPaymentStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "pending":
      return "pending" as const;
    case "failed":
    case "expired":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

export function CustomerPaymentsTable({
  payments,
  isLoading,
}: {
  payments?: CustomerPaymentRow[];
  isLoading?: boolean;
}) {
  const columns = useMemo(
    () => [
      {
        id: "payment",
        header: "Payment",
        enableHiding: false,
        minSize: 140,
        cell: ({ row }: { row: { original: CustomerPaymentRow } }) => (
          <Link
            href={`/dashboard/payments/${row.original.id}`}
            className="font-mono text-xs decoration-dotted underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.id}
          </Link>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }: { row: { original: CustomerPaymentRow } }) =>
          formatAssetAmount(row.original.amount, row.original.settlement_asset),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: CustomerPaymentRow } }) => (
          <StatusBadge
            variant={getPaymentStatusVariant(row.original.status)}
            icon={null}
          >
            {row.original.status}
          </StatusBadge>
        ),
      },
      {
        id: "payer",
        header: "Payer",
        cell: ({ row }: { row: { original: CustomerPaymentRow } }) =>
          row.original.payer_address ? (
            <CopyText
              value={row.original.payer_address}
              className="truncate font-mono text-xs"
            >
              {`${row.original.payer_address.slice(0, 8)}...${row.original.payer_address.slice(-4)}`}
            </CopyText>
          ) : (
            "-"
          ),
      },
      {
        id: "createdAt",
        header: "Created",
        cell: ({ row }: { row: { original: CustomerPaymentRow } }) => (
          <TimestampTooltip
            timestamp={row.original.created_at}
            rows={["local", "utc"]}
            side="left"
          >
            <span>{formatDateTimeSmart(row.original.created_at)}</span>
          </TimestampTooltip>
        ),
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: payments ?? [],
    columns,
    loading: isLoading,
    resourceName: (plural) => `payment${plural ? "s" : ""}`,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
  });

  if (!isLoading && (payments?.length ?? 0) === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-12">
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Payments linked to this customer will appear here."
        />
      </div>
    );
  }

  return <Table {...tableProps} table={table} />;
}
