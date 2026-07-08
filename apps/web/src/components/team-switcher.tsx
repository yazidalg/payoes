"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import type { Organization } from "@/lib/db/schema";
import { getHubPathAfterOrganizationSwitch } from "@/lib/navigation/org-switch-redirect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

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
  const router = useRouter();
  const pathname = usePathname();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const currentOrganization = activeOrganization ?? organizations[0];

  if (!currentOrganization) {
    return null;
  }

  async function selectOrganization(organization: Organization) {
    if (organization.id === currentOrganization.id || isSwitching) {
      return;
    }

    setIsSwitching(true);

    try {
      const response = await fetch("/api/session/active-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: organization.id }),
      });

      const data = (await response.json()) as {
        organization?: Organization;
        error?: string;
      };

      if (!response.ok || !data.organization) {
        toast.error(data.error ?? "Unable to switch organization");
        return;
      }

      onOrganizationChange?.(data.organization);

      const hubPath = getHubPathAfterOrganizationSwitch(pathname);

      if (hubPath) {
        router.push(hubPath);
      }

      router.refresh();
    } catch {
      toast.error("Unable to switch organization");
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isSwitching}
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
            className="w-fit min-w-56"
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
                  onClick={() => void selectOrganization(organization)}
                  className="gap-2 p-2"
                  disabled={isSwitching}
                >
                  <div className="flex size-6 items-center justify-center overflow-hidden rounded-md border bg-background text-[10px] font-semibold">
                    <OrganizationMark
                      organization={organization}
                      className="size-full object-cover"
                    />
                  </div>
                  <span className="flex-1 truncate">{organization.name}</span>
                  {organization.id === currentOrganization.id ? (
                    <CheckIcon className="size-4 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/organizations/new" />}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-md border border-dashed bg-background">
                <PlusIcon className="size-4" />
              </div>
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
