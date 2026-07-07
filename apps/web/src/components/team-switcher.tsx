"use client";

import * as React from "react";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import type { Organization } from "@/lib/db/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsUpDownIcon } from "lucide-react";

export function TeamSwitcher({
  organizations,
  activeOrganization,
  onOrganizationChange,
}: {
  organizations: Organization[];
  activeOrganization?: Organization;
  onOrganizationChange?: (organization: Organization) => void;
}) {
  const { isMobile } = useSidebar();
  const [internalOrganization, setInternalOrganization] = React.useState(
    organizations[0]
  );

  const currentOrganization = activeOrganization ?? internalOrganization;

  if (!currentOrganization) {
    return null;
  }

  function selectOrganization(organization: Organization) {
    setInternalOrganization(organization);
    onOrganizationChange?.(organization);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              <OrganizationMark
                organization={currentOrganization}
                className="size-full object-cover"
              />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {currentOrganization.name}
              </span>
              <span className="truncate text-xs capitalize">
                {currentOrganization.environment} workspace
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  onClick={() => selectOrganization(organization)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center overflow-hidden rounded-md border bg-background text-[10px] font-semibold">
                    <OrganizationMark
                      organization={organization}
                      className="size-full object-cover"
                    />
                  </div>
                  {organization.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
