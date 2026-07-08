"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDocsUrl } from "@/lib/docs/url";
import { cn } from "@/lib/utils";
import {
  ArrowUpRightIcon,
  CircleDollarSignIcon,
  FileTextIcon,
  LinkIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  WalletIcon,
} from "lucide-react";

type RevenueRange = "7D" | "30D" | "90D" | "1Y";

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const paymentStatusChartConfig = {
  succeeded: { label: "Succeeded", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-3)" },
  expired: { label: "Expired", color: "var(--chart-4)" },
  failed: { label: "Failed", color: "var(--chart-5)" },
} satisfies ChartConfig;

const acceptedAssetsChartConfig = {
  usdc: { label: "USDC", color: "var(--chart-1)" },
  xlm: { label: "XLM", color: "var(--chart-2)" },
  eurc: { label: "EURC", color: "var(--chart-3)" },
} satisfies ChartConfig;

const paymentStatusData = [
  { key: "succeeded", name: "Succeeded", value: 1284, fill: "var(--color-succeeded)" },
  { key: "pending", name: "Pending", value: 12, fill: "var(--color-pending)" },
  { key: "expired", name: "Expired", value: 18, fill: "var(--color-expired)" },
  { key: "failed", name: "Failed", value: 9, fill: "var(--color-failed)" },
];

const acceptedAssetsData = [
  { key: "usdc", name: "USDC", value: 85, fill: "var(--color-usdc)" },
  { key: "xlm", name: "XLM", value: 13, fill: "var(--color-xlm)" },
  { key: "eurc", name: "EURC", value: 2, fill: "var(--color-eurc)" },
];

const recentPayments = [
  { id: "pay_xxx", customer: "John", amount: "$20", status: "Paid" as const },
  { id: "pay_yyy", customer: "Alice", amount: "$150", status: "Pending" as const },
  { id: "pay_zzz", customer: "Bob", amount: "$10", status: "Expired" as const },
];

const recentInvoices = [
  { id: "INV-001", customer: "Acme", total: "$120", status: "Paid" as const },
  { id: "INV-002", customer: "John", total: "$35", status: "Open" as const },
];

const revenueSeries: Record<RevenueRange, { label: string; revenue: number }[]> = {
  "7D": [
    { label: "Mon", revenue: 420 },
    { label: "Tue", revenue: 510 },
    { label: "Wed", revenue: 380 },
    { label: "Thu", revenue: 640 },
    { label: "Fri", revenue: 720 },
    { label: "Sat", revenue: 290 },
    { label: "Sun", revenue: 410 },
  ],
  "30D": [
    { label: "Mar 10", revenue: 280 },
    { label: "Mar 13", revenue: 340 },
    { label: "Mar 16", revenue: 410 },
    { label: "Mar 19", revenue: 390 },
    { label: "Mar 22", revenue: 520 },
    { label: "Mar 25", revenue: 470 },
    { label: "Mar 28", revenue: 610 },
    { label: "Mar 31", revenue: 560 },
    { label: "Apr 3", revenue: 680 },
    { label: "Apr 6", revenue: 720 },
  ],
  "90D": [
    { label: "Jan", revenue: 2800 },
    { label: "Feb", revenue: 3200 },
    { label: "Mar", revenue: 4100 },
    { label: "Apr", revenue: 2440 },
  ],
  "1Y": [
    { label: "Q2", revenue: 2100 },
    { label: "Q3", revenue: 2800 },
    { label: "Q4", revenue: 3400 },
    { label: "Q1", revenue: 4240 },
  ],
};

const revenueRangeLabels: Record<RevenueRange, string> = {
  "7D": "Last 7 days",
  "30D": "Last 30 days",
  "90D": "Last 90 days",
  "1Y": "Last year",
};

function paymentStatusVariant(status: (typeof recentPayments)[number]["status"]) {
  switch (status) {
    case "Paid":
      return "success" as const;
    case "Pending":
      return "warning" as const;
    case "Expired":
      return "muted" as const;
    default:
      return "outline" as const;
  }
}

function invoiceStatusVariant(status: (typeof recentInvoices)[number]["status"]) {
  switch (status) {
    case "Paid":
      return "success" as const;
    case "Open":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{title}</CardDescription>
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export function DashboardHome() {
  const [revenueRange, setRevenueRange] = useState<RevenueRange>("30D");
  const revenueData = useMemo(() => revenueSeries[revenueRange], [revenueRange]);
  const docsUrl = getDocsUrl();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of payment volume, revenue, and recent activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Volume"
          value="$12,540.20"
          icon={CircleDollarSignIcon}
        />
        <MetricCard
          title="Successful Payments"
          value="1,284"
          icon={ReceiptIcon}
        />
        <MetricCard title="Success Rate" value="98.6%" icon={PercentIcon} />
        <MetricCard title="Pending Payments" value="12" icon={WalletIcon} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>{revenueRangeLabels[revenueRange]}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
              {(["7D", "30D", "90D", "1Y"] as RevenueRange[]).map((range) => (
                <Button
                  key={range}
                  type="button"
                  size="xs"
                  variant={revenueRange === range ? "default" : "ghost"}
                  className={cn("min-w-10")}
                  onClick={() => setRevenueRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="aspect-[16/7] h-72 w-full">
              <AreaChart data={revenueData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={48}
                  tickFormatter={(value: number) => `$${value}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  fill="url(#revenueFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Distribution of payment outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={paymentStatusChartConfig} className="mx-auto aspect-square h-52 max-h-52">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={paymentStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={78}
                    strokeWidth={4}
                  >
                    {paymentStatusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {paymentStatusData.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accepted Assets</CardTitle>
              <CardDescription>Share of settled volume by asset</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={acceptedAssetsChartConfig} className="mx-auto aspect-square h-44 max-h-44">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={acceptedAssetsData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={68}
                    strokeWidth={4}
                  >
                    {acceptedAssetsData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                {acceptedAssetsData.map((asset) => (
                  <div
                    key={asset.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: asset.fill }}
                      />
                      <span>{asset.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{asset.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest payment activity in your workspace</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                    <TableCell>{payment.customer}</TableCell>
                    <TableCell>{payment.amount}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to move faster</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              render={<Link href="/dashboard/payments/checkout-sessions" />}
            >
              <PlusIcon />
              Create Payment
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              render={<Link href="/dashboard/payments/invoices/new" />}
            >
              <FileTextIcon />
              Create Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              render={<Link href="/dashboard/payments/links/new" />}
            >
              <LinkIcon />
              Create Payment Link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              render={
                <a href={docsUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ArrowUpRightIcon />
              View API Docs
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Latest invoices sent to customers</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell>{invoice.total}</TableCell>
                  <TableCell>
                    <Badge variant={invoiceStatusVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
