"use client";

import {
  CircleDollar,
  CreditCard,
  Cube,
  InvoiceDollar,
  User,
} from "@dub/ui/icons";
import type { DashboardAnalytics } from "@/lib/analytics/types";
import { AssetIcon } from "@/ui/assets/asset-icon";
import { CustomerAvatar } from "@/ui/customers/customer-avatar";
import { AnalyticsCard } from "./analytics-card";
import { BarList, getMaxValue } from "./bar-list";

function EmptyBreakdownMessage() {
  return (
    <div className="flex h-40 items-center justify-center px-6 text-sm text-neutral-500">
      No data for this period.
    </div>
  );
}

export function StatsGrid({
  analytics,
}: {
  analytics: DashboardAnalytics | null;
}) {
  const breakdowns = analytics?.breakdowns;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <PaymentMethodsSection items={breakdowns?.paymentMethods ?? []} />
      <AssetsSection items={breakdowns?.assets ?? []} />
      <StatusSection items={breakdowns?.status ?? []} />
      <CustomersSection items={breakdowns?.customers ?? []} />
    </div>
  );
}

function PaymentMethodsSection({
  items,
}: {
  items: DashboardAnalytics["breakdowns"]["paymentMethods"];
}) {
  const data = items.map((item) => ({
    icon: <InvoiceDollar className="size-4 text-neutral-700" />,
    title: item.label,
    value: item.value,
  }));

  return (
    <AnalyticsCard
      tabs={[{ id: "methods", label: "Payment Methods", icon: CreditCard }]}
      selectedTabId="methods"
      expandLimit={5}
      dataLength={data.length}
    >
      {({ limit, setShowModal }) =>
        data.length > 0 ? (
          <BarList
            tab="methods"
            unit="payments"
            data={data}
            maxValue={getMaxValue(data)}
            setShowModal={setShowModal}
            limit={limit}
            barBackground="bg-blue-100/50"
            hoverBackground="hover:bg-blue-50"
          />
        ) : (
          <EmptyBreakdownMessage />
        )
      }
    </AnalyticsCard>
  );
}

function AssetsSection({
  items,
}: {
  items: DashboardAnalytics["breakdowns"]["assets"];
}) {
  const data = items.map((item) => ({
    icon: <AssetIcon assetCode={item.key} className="size-6" />,
    title: item.label,
    value: item.value,
  }));

  return (
    <AnalyticsCard
      tabs={[{ id: "assets", label: "Assets", icon: Cube }]}
      selectedTabId="assets"
      expandLimit={5}
      dataLength={data.length}
    >
      {({ limit, setShowModal }) =>
        data.length > 0 ? (
          <BarList
            tab="assets"
            unit="volume"
            data={data}
            maxValue={getMaxValue(data)}
            setShowModal={setShowModal}
            limit={limit}
            barBackground="bg-violet-100/50"
            hoverBackground="hover:bg-violet-50"
          />
        ) : (
          <EmptyBreakdownMessage />
        )
      }
    </AnalyticsCard>
  );
}

function StatusSection({
  items,
}: {
  items: DashboardAnalytics["breakdowns"]["status"];
}) {
  const data = items.map((item) => ({
    icon: <CircleDollar className="size-4 text-neutral-700" />,
    title: item.label,
    value: item.value,
  }));

  return (
    <AnalyticsCard
      tabs={[{ id: "status", label: "Status", icon: CircleDollar }]}
      selectedTabId="status"
      expandLimit={5}
      dataLength={data.length}
    >
      {({ limit, setShowModal }) =>
        data.length > 0 ? (
          <BarList
            tab="status"
            unit="payments"
            data={data}
            maxValue={getMaxValue(data)}
            setShowModal={setShowModal}
            limit={limit}
            barBackground="bg-teal-100/50"
            hoverBackground="hover:bg-teal-50"
          />
        ) : (
          <EmptyBreakdownMessage />
        )
      }
    </AnalyticsCard>
  );
}

function CustomersSection({
  items,
}: {
  items: DashboardAnalytics["breakdowns"]["customers"];
}) {
  const data = items.map((item) => ({
    icon: (
      <CustomerAvatar
        customer={{
          id: item.key,
          name: item.label,
        }}
        className="size-6 border border-neutral-200"
      />
    ),
    title: item.label,
    value: item.value,
  }));

  return (
    <AnalyticsCard
      tabs={[{ id: "customers", label: "Customers", icon: User }]}
      selectedTabId="customers"
      expandLimit={8}
      dataLength={data.length}
    >
      {({ limit, setShowModal }) =>
        data.length > 0 ? (
          <BarList
            tab="customers"
            unit="volume"
            data={data}
            maxValue={getMaxValue(data)}
            setShowModal={setShowModal}
            limit={limit}
            barBackground="bg-orange-100/50"
            hoverBackground="hover:bg-orange-50"
          />
        ) : (
          <EmptyBreakdownMessage />
        )
      }
    </AnalyticsCard>
  );
}
