"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { cn, nFormatter } from "@dub/utils";
import { motion } from "motion/react";
import { ReactNode } from "react";

export function BarList({
  tab,
  unit,
  data,
  maxValue,
  setShowModal,
  limit,
  barBackground,
  hoverBackground,
}: {
  tab: string;
  unit: string;
  data: {
    icon: ReactNode;
    title: string;
    value: number;
  }[];
  maxValue: number;
  setShowModal: (show: boolean) => void;
  limit?: number;
  barBackground: string;
  hoverBackground: string;
}) {
  const filteredData = limit ? data.slice(0, limit) : data;
  const totalSum = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <NumberFlowGroup>
      <div className="relative grid h-full auto-rows-min grid-cols-1">
        {filteredData.map((item, idx) => (
          <LineItem
            key={idx}
            icon={item.icon}
            title={item.title}
            value={item.value}
            totalSum={totalSum}
            tab={tab}
            unit={unit}
            setShowModal={setShowModal}
            barBackground={barBackground}
            hoverBackground={hoverBackground}
            limit={limit}
          />
        ))}
      </div>
    </NumberFlowGroup>
  );
}

function LineItem({
  icon,
  title,
  value,
  totalSum,
  tab,
  unit,
  setShowModal,
  barBackground,
  hoverBackground,
  limit,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  totalSum: number;
  tab: string;
  unit: string;
  setShowModal: (show: boolean) => void;
  barBackground: string;
  hoverBackground: string;
  limit?: number;
}) {
  const percentage = Math.round((value / totalSum) * 1000) / 10;
  const isModalView = !limit;

  return (
    <div
      onClick={() => {
        if (!limit) setShowModal(false);
      }}
      className={cn(
        "group block min-w-0 border-l-2 border-transparent px-4 py-1 transition-all",
        hoverBackground,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-between",
          isModalView && "gap-16",
        )}
      >
        <motion.div
          style={{
            width: `${percentage}%`,
            position: "absolute",
            inset: 0,
          }}
          className={cn("-z-10 h-full origin-left rounded-md", barBackground)}
          transition={{ ease: "easeOut", duration: 0.3 }}
          initial={{ transform: "scaleX(0)" }}
          animate={{ transform: "scaleX(1)" }}
        />
        <div className="relative z-10 flex h-8 w-full min-w-0 max-w-[calc(100%-2rem)] items-center transition-[max-width] duration-300 ease-in-out group-hover:max-w-[calc(100%-5rem)]">
          <div className="z-10 flex items-center space-x-4 overflow-hidden px-3">
            <div className="flex size-6 shrink-0 items-center justify-center">
              {icon}
            </div>
            <div className="truncate text-sm text-neutral-800">{title}</div>
          </div>
        </div>
        <div className="z-10 flex items-center">
          <NumberFlow
            value={unit === "volume" ? value / 100 : value}
            className={cn(
              "z-10 px-2 text-sm text-neutral-600 transition-transform duration-300",
              isModalView ? "-translate-x-14" : "group-hover:-translate-x-14",
            )}
            style={{
              transform: `translateX(var(--tw-translate-x, 0)) translateZ(0)`,
            }}
            format={
              unit === "volume"
                ? {
                    style: "currency",
                    currency: "USD",
                  }
                : {
                    notation: value > 999999 ? "compact" : "standard",
                  }
            }
          />
          <div
            className={cn(
              "absolute right-0 px-3 text-sm text-neutral-600/70 transition-all duration-300",
              isModalView
                ? "visible translate-x-0 opacity-100"
                : "invisible translate-x-14 opacity-0 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100",
            )}
            style={{
              transform: `translateX(var(--tw-translate-x, 0)) translateZ(0)`,
            }}
          >
            {percentage}%
          </div>
        </div>
      </div>
    </div>
  );
}

export function getMaxValue(data: { value: number }[]) {
  return Math.max(...data.map((d) => d.value), 0);
}
