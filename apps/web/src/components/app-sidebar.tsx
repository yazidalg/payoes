"use client";

import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import type { Organization } from "@/lib/db/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

export function AppSidebar({
  user,
  organizations,
  activeOrganization,
  onOrganizationChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  organizations: Organization[];
  activeOrganization?: Organization;
  onOrganizationChange?: (organization: Organization) => void;
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          organizations={organizations}
          activeOrganization={activeOrganization}
          onOrganizationChange={onOrganizationChange}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
