"use client";

import type { Organization } from "@/lib/db/schema";
import { useEffect, useState } from "react";
import { DashboardShellProvider } from "./dashboard-shell-context";

export function DashboardMainNav({
  user,
  organizations,
  initialActiveOrganization,
  children,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  organizations: Organization[];
  initialActiveOrganization: Organization;
  children: React.ReactNode;
}) {
  const [activeOrganization, setActiveOrganization] = useState(
    initialActiveOrganization,
  );

  useEffect(() => {
    setActiveOrganization(initialActiveOrganization);
  }, [initialActiveOrganization]);

  return (
    <DashboardShellProvider
      value={{
        user,
        organizations,
        activeOrganization,
        setActiveOrganization,
      }}
    >
      {children}
    </DashboardShellProvider>
  );
}
