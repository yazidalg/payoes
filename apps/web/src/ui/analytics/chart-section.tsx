"use client";

import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import { format, parseISO } from "date-fns";
import { Fragment, useMemo } from "react";
import type { DashboardAnalytics, MetricTab } from "@/lib/analytics/types";
import { MetricTabs } from "./metric-tabs";

function formatTooltipDate(date: Date) {
  return format(date, "MMM d, yyyy");
}

export function ChartSection({
  selectedTab,
  onSelectTab,
  analytics,
  isLoading,
}: {
  selectedTab: MetricTab;
  onSelectTab: (tab: MetricTab) => void;
  analytics: DashboardAnalytics | null;
  isLoading: boolean;
}) {
  const chartData = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return analytics.timeseries.map((point) => ({
      date: parseISO(point.date),
      values: {
        volume: point.volume,
        payments: point.payments,
        successRate: point.successRate,
      },
    }));
  }, [analytics]);

  const series = [
    {
      id: "volume",
      valueAccessor: (d: (typeof chartData)[number]) => d.values.volume,
      isActive: selectedTab === "volume",
      colorClassName: "text-primary",
    },
    {
      id: "payments",
      valueAccessor: (d: (typeof chartData)[number]) => d.values.payments,
      isActive: selectedTab === "payments",
      colorClassName: "text-violet-600",
    },
    {
      id: "successRate",
      valueAccessor: (d: (typeof chartData)[number]) => d.values.successRate,
      isActive: selectedTab === "successRate",
      colorClassName: "text-teal-400",
    },
  ];

  const activeSeries = series.find(({ id }) => id === selectedTab);
  const totals = analytics?.totals ?? {
    volume: 0,
    payments: 0,
    successRate: 0,
  };

  return (
    <div className="w-full overflow-hidden bg-white">
      <div className="border border-neutral-200 sm:rounded-t-xl">
        <MetricTabs
          tab={selectedTab}
          totals={totals}
          onSelectTab={onSelectTab}
        />
      </div>
      <div className="relative overflow-hidden border-x border-b border-neutral-200 sm:rounded-b-xl">
        <div className="p-5 pt-10 sm:p-10">
          <div className="flex h-96 w-full items-center justify-center">
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600" />
            ) : chartData.length > 0 ? (
              <TimeSeriesChart
                data={chartData}
                series={series}
                defaultTooltipIndex={
                  chartData.length > 1 ? chartData.length - 2 : 0
                }
                tooltipClassName="p-0"
                tooltipContent={(d) => (
                  <>
                    <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                      {formatTooltipDate(d.date)}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                      <Fragment key={selectedTab}>
                        <div className="flex items-center gap-2">
                          {activeSeries && (
                            <div
                              className={cn(
                                activeSeries.colorClassName,
                                "h-2 w-2 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                              )}
                            />
                          )}
                          <p className="capitalize text-neutral-600">
                            {selectedTab === "successRate"
                              ? "Success rate"
                              : selectedTab}
                          </p>
                        </div>
                        <p className="text-right font-medium text-neutral-900">
                          {selectedTab === "volume"
                            ? currencyFormatter(d.values.volume)
                            : selectedTab === "successRate"
                              ? `${d.values.successRate}%`
                              : nFormatter(d.values.payments, { full: true })}
                        </p>
                      </Fragment>
                    </div>
                  </>
                )}
              >
                <Areas />
                <XAxis tickFormat={(d) => formatTooltipDate(d)} />
                <YAxis
                  showGridLines
                  tickFormat={
                    selectedTab === "volume"
                      ? (v) =>
                          currencyFormatter(v, {
                            trailingZeroDisplay: "stripIfInteger",
                          })
                      : selectedTab === "successRate"
                        ? (v) => `${v}%`
                        : nFormatter
                  }
                />
              </TimeSeriesChart>
            ) : (
              <p className="text-sm text-neutral-500">No data for this period.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
