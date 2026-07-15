"use client";

import { createContext, useContext } from "react";
import type { Organization } from "@/lib/db/schema";

export type DashboardShellUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type DashboardShellContextValue = {
  user: DashboardShellUser;
  setUser: (
    user: DashboardShellUser | ((current: DashboardShellUser) => DashboardShellUser),
  ) => void;
  organizations: Organization[];
  setOrganizations: (
    organizations:
      | Organization[]
      | ((current: Organization[]) => Organization[]),
  ) => void;
  activeOrganization: Organization;
  setActiveOrganization: (organization: Organization) => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(
  null,
);

export function DashboardShellProvider({
  value,
  children,
}: {
  value: DashboardShellContextValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext);

  if (!context) {
    throw new Error("useDashboardShell must be used within DashboardShellProvider");
  }

  return context;
}
