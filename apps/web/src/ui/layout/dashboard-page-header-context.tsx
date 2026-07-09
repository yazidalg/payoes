"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PageContentHeaderProps } from "./page-content/page-content-header";

export type DashboardPageHeaderOverride = Pick<
  PageContentHeaderProps,
  "title" | "titleInfo" | "controls" | "headerContent"
>;

type DashboardPageHeaderContextValue = {
  override: DashboardPageHeaderOverride | null;
  setOverride: (override: DashboardPageHeaderOverride | null) => void;
};

const DashboardPageHeaderContext =
  createContext<DashboardPageHeaderContextValue | null>(null);

export function DashboardPageHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [override, setOverride] = useState<DashboardPageHeaderOverride | null>(
    null,
  );

  const value = useMemo(
    () => ({
      override,
      setOverride,
    }),
    [override],
  );

  return (
    <DashboardPageHeaderContext.Provider value={value}>
      {children}
    </DashboardPageHeaderContext.Provider>
  );
}

export function useDashboardPageHeaderOverride() {
  return useContext(DashboardPageHeaderContext)?.override ?? null;
}

export function useSetDashboardPageHeader(
  override: DashboardPageHeaderOverride | null,
) {
  const context = useContext(DashboardPageHeaderContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setOverride(override);
    return () => context.setOverride(null);
  }, [context, override]);
}
