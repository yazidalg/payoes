"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { cn } from "@dub/utils";
import { ChevronRight } from "lucide-react";
import type { DashboardAnalytics, MetricTab } from "@/lib/analytics/types";

type Tab = {
  id: MetricTab;
  label: string;
  colorClassName: string;
};

const TABS: Tab[] = [
  {
    id: "volume",
    label: "Volume",
    colorClassName: "text-blue-500/50",
  },
  {
    id: "payments",
    label: "Payments",
    colorClassName: "text-violet-600/50",
  },
  {
    id: "successRate",
    label: "Success Rate",
    colorClassName: "text-teal-400/50",
  },
];

export function MetricTabs({
  tab,
  totals,
  onSelectTab,
}: {
  tab: MetricTab;
  totals: DashboardAnalytics["totals"];
  onSelectTab: (id: MetricTab) => void;
}) {
  return (
    <div className="grid w-full grid-cols-3 divide-x divide-neutral-200 overflow-y-hidden">
      <NumberFlowGroup>
        {TABS.map(({ id, label, colorClassName }, idx) => (
          <div key={id} className="relative z-0">
            {idx > 0 && (
              <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1.5">
                <ChevronRight
                  className="h-3 w-3 text-neutral-400"
                  strokeWidth={2.5}
                />
              </div>
            )}
            <button
              type="button"
              className={cn(
                "border-box relative block h-full min-w-[110px] w-full flex-none px-4 py-3 text-left sm:min-w-[240px] sm:px-8 sm:py-6",
                "transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100",
                "ring-inset ring-neutral-500 focus-visible:ring-1 sm:first:rounded-tl-xl",
              )}
              onClick={() => onSelectTab(id)}
            >
              <div
                className={cn(
                  "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                  tab !== id && "translate-y-[3px]",
                )}
              />

              <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                <div
                  className={cn(
                    "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                    colorClassName,
                  )}
                />
                <span>{label}</span>
              </div>
              <div className="mt-1 flex h-12 items-center">
                <NumberFlow
                  value={id === "volume" ? totals.volume : totals[id]}
                  className="text-xl font-medium sm:text-3xl"
                  format={
                    id === "volume"
                      ? {
                          style: "currency",
                          currency: "USD",
                          trailingZeroDisplay: "stripIfInteger",
                        }
                      : id === "successRate"
                        ? {
                            style: "decimal",
                            maximumFractionDigits: 1,
                            minimumFractionDigits: 1,
                          }
                        : {
                            notation:
                              totals[id] > 999999 ? "compact" : "standard",
                          }
                  }
                  suffix={id === "successRate" ? "%" : undefined}
                />
              </div>
            </button>
          </div>
        ))}
      </NumberFlowGroup>
    </div>
  );
}
