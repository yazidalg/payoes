import { and, gte, inArray, lte } from "drizzle-orm";
import { eachDayOfInterval, endOfDay, formatISO, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { customers, payments, type Organization } from "@/lib/db/schema";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import type {
  AnalyticsBreakdownItem,
  DashboardAnalytics,
  DashboardAnalyticsTimeseriesPoint,
} from "./types";

type PaymentAnalyticsRow = {
  id: string;
  status: (typeof payments.$inferSelect)["status"];
  sourceType: (typeof payments.$inferSelect)["sourceType"];
  pricingAmount: string | null;
  pricingCurrency: string | null;
  quotedSettlementAmount: string | null;
  paidAsset: string | null;
  settlementAsset: string;
  customerId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  checkout_session: "Checkout Sessions",
  invoice: "Invoices",
  payment_link: "Payment Links",
  direct: "Manual",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Succeeded",
  pending: "Pending",
  deposit_received: "Processing",
  settling: "Processing",
  settlement_failed: "Settlement failed",
  refunding: "Refunding",
  refunded: "Refunded",
  failed: "Failed",
  expired: "Expired",
};

function aggregatePaymentStatus(status: PaymentAnalyticsRow["status"]) {
  if (
    status === "deposit_received" ||
    status === "settling" ||
    status === "refunding"
  ) {
    return "pending";
  }

  if (status === "settlement_failed" || status === "refunded") {
    return "failed";
  }

  return status;
}

const SOURCE_TYPE_ORDER = [
  "checkout_session",
  "invoice",
  "payment_link",
  "direct",
] as const;

const STATUS_ORDER = ["completed", "pending", "failed", "expired"] as const;

function parseAmount(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPaymentVolume(payment: PaymentAnalyticsRow) {
  if (payment.status !== "completed") {
    return 0;
  }

  const currency = payment.pricingCurrency?.trim().toUpperCase();

  if (
    payment.pricingAmount &&
    (!currency || currency === "USD")
  ) {
    return parseAmount(payment.pricingAmount);
  }

  return parseAmount(payment.quotedSettlementAmount);
}

function getPaymentAsset(payment: PaymentAnalyticsRow) {
  return payment.paidAsset?.trim() || payment.settlementAsset?.trim() || "Unknown";
}

function calculateSuccessRate(counts: {
  completed: number;
  failed: number;
  expired: number;
}) {
  const finalized = counts.completed + counts.failed + counts.expired;

  if (finalized === 0) {
    return 0;
  }

  return Math.round((counts.completed / finalized) * 1000) / 10;
}

function buildTimeseries(
  rows: PaymentAnalyticsRow[],
  from: Date,
  to: Date,
): DashboardAnalyticsTimeseriesPoint[] {
  const days = eachDayOfInterval({
    start: startOfDay(from),
    end: startOfDay(to),
  });

  const buckets = new Map<
    string,
    {
      volume: number;
      payments: number;
      completed: number;
      failed: number;
      expired: number;
    }
  >();

  for (const day of days) {
    buckets.set(formatISO(startOfDay(day), { representation: "date" }), {
      volume: 0,
      payments: 0,
      completed: 0,
      failed: 0,
      expired: 0,
    });
  }

  for (const payment of rows) {
    const dayKey = formatISO(startOfDay(payment.createdAt), {
      representation: "date",
    });
    const bucket = buckets.get(dayKey);

    if (!bucket) {
      continue;
    }

    bucket.payments += 1;

    if (payment.status === "completed") {
      bucket.completed += 1;
      bucket.volume += getPaymentVolume(payment);
    } else if (payment.status === "failed") {
      bucket.failed += 1;
    } else if (payment.status === "expired") {
      bucket.expired += 1;
    }
  }

  return days.map((day) => {
    const dayKey = formatISO(startOfDay(day), { representation: "date" });
    const bucket = buckets.get(dayKey) ?? {
      volume: 0,
      payments: 0,
      completed: 0,
      failed: 0,
      expired: 0,
    };

    return {
      date: dayKey,
      volume: bucket.volume,
      payments: bucket.payments,
      successRate: calculateSuccessRate(bucket),
    };
  });
}

function buildBreakdown(
  items: Map<string, { label: string; value: number }>,
  order?: readonly string[],
): AnalyticsBreakdownItem[] {
  const sorted = [...items.entries()].sort((a, b) => b[1].value - a[1].value);

  if (!order) {
    return sorted.map(([key, item]) => ({
      key,
      label: item.label,
      value: item.value,
    }));
  }

  const orderedKeys = order.filter((key) => items.has(key));
  const remaining = sorted
    .map(([key]) => key)
    .filter((key) => !orderedKeys.includes(key));

  return [...orderedKeys, ...remaining].map((key) => {
    const item = items.get(key)!;
    return {
      key,
      label: item.label,
      value: item.value,
    };
  });
}

export async function getOrganizationAnalytics(
  organizationId: string,
  environment: Organization["environment"],
  from: Date,
  to: Date,
): Promise<DashboardAnalytics> {
  const rangeFrom = startOfDay(from);
  const rangeTo = endOfDay(to);

  const rows = await db
    .select({
      id: payments.id,
      status: payments.status,
      sourceType: payments.sourceType,
      pricingAmount: payments.pricingAmount,
      pricingCurrency: payments.pricingCurrency,
      quotedSettlementAmount: payments.quotedSettlementAmount,
      paidAsset: payments.paidAsset,
      settlementAsset: payments.settlementAsset,
      customerId: payments.customerId,
      confirmedAt: payments.confirmedAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(
      and(
        organizationEnvironmentWhere(
          payments.organizationId,
          payments.environment,
          organizationId,
          environment,
        ),
        gte(payments.createdAt, rangeFrom),
        lte(payments.createdAt, rangeTo),
      ),
    );

  const customerIds = [
    ...new Set(
      rows
        .map((row) => row.customerId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const customerRows =
    customerIds.length > 0
      ? await db
          .select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
          })
          .from(customers)
          .where(inArray(customers.id, customerIds))
      : [];

  const customerNameById = new Map(
    customerRows.map((customer) => [
      customer.id,
      customer.name?.trim() ||
        customer.email?.trim() ||
        "Unknown customer",
    ]),
  );

  const statusCounts = {
    completed: 0,
    pending: 0,
    failed: 0,
    expired: 0,
  };

  const paymentMethods = new Map<string, { label: string; value: number }>();
  const assets = new Map<string, { label: string; value: number }>();
  const statuses = new Map<string, { label: string; value: number }>();
  const customerVolumes = new Map<string, { label: string; value: number }>();

  let totalVolume = 0;

  for (const payment of rows) {
    const aggregateStatus = aggregatePaymentStatus(payment.status);
    statusCounts[aggregateStatus] += 1;

    const sourceKey = payment.sourceType;
    const sourceEntry = paymentMethods.get(sourceKey) ?? {
      label: SOURCE_TYPE_LABELS[sourceKey] ?? sourceKey,
      value: 0,
    };
    sourceEntry.value += 1;
    paymentMethods.set(sourceKey, sourceEntry);

    const statusKey = payment.status;
    const statusEntry = statuses.get(statusKey) ?? {
      label: STATUS_LABELS[statusKey] ?? statusKey,
      value: 0,
    };
    statusEntry.value += 1;
    statuses.set(statusKey, statusEntry);

    if (payment.status === "completed") {
      const volume = getPaymentVolume(payment);
      totalVolume += volume;

      const assetKey = getPaymentAsset(payment);
      const assetEntry = assets.get(assetKey) ?? {
        label: assetKey,
        value: 0,
      };
      assetEntry.value += volume;
      assets.set(assetKey, assetEntry);

      if (payment.customerId) {
        const customerLabel =
          customerNameById.get(payment.customerId) ?? "Unknown customer";
        const customerEntry = customerVolumes.get(payment.customerId) ?? {
          label: customerLabel,
          value: 0,
        };
        customerEntry.value += volume;
        customerVolumes.set(payment.customerId, customerEntry);
      }
    }
  }

  const topCustomers = [...customerVolumes.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 8)
    .map(([key, item]) => ({
      key,
      label: item.label,
      value: item.value,
    }));

  return {
    totals: {
      volume: totalVolume,
      payments: rows.length,
      successRate: calculateSuccessRate(statusCounts),
    },
    timeseries: buildTimeseries(rows, rangeFrom, rangeTo),
    breakdowns: {
      paymentMethods: buildBreakdown(paymentMethods, SOURCE_TYPE_ORDER),
      assets: buildBreakdown(assets),
      status: buildBreakdown(statuses, STATUS_ORDER),
      customers: topCustomers,
    },
  };
}
