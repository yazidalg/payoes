"use client";

import type { Organization } from "@/lib/db/schema";
import { useEffect, useState } from "react";
import {
  DashboardShellProvider,
  type DashboardShellUser,
} from "./dashboard-shell-context";

export function DashboardMainNav({
  user,
  organizations,
  initialActiveOrganization,
  children,
}: {
  user: DashboardShellUser;
  organizations: Organization[];
  initialActiveOrganization: Organization;
  children: React.ReactNode;
}) {
  const [userState, setUser] = useState(user);
  const [activeOrganization, setActiveOrganization] = useState(
    initialActiveOrganization,
  );
  const [organizationsState, setOrganizations] = useState(organizations);

  useEffect(() => {
    setUser({
      name: user.name,
      email: user.email,
      image: user.image,
    });
  }, [user.name, user.email, user.image]);

  useEffect(() => {
    setActiveOrganization(initialActiveOrganization);
  }, [initialActiveOrganization]);

  useEffect(() => {
    setOrganizations(organizations);
  }, [organizations]);

  return (
    <DashboardShellProvider
      value={{
        user: userState,
        setUser,
        organizations: organizationsState,
        setOrganizations,
        activeOrganization,
        setActiveOrganization,
      }}
    >
      {children}
    </DashboardShellProvider>
  );
}
