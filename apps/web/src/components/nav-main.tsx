"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AppIcon } from "@/components/ui/app-icon";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  dashboardNav,
  isNavGroupActive,
  isNavItemActive,
  type DashboardNavItem,
} from "@/lib/navigation/dashboard-nav";
import { ChevronRightIcon } from "lucide-react";

function NavGroup({ item }: { item: DashboardNavItem }) {
  const pathname = usePathname();
  const isActive = isNavGroupActive(pathname, item);
  const [openOverride, setOpenOverride] = useState<boolean | undefined>(undefined);
  const open = openOverride ?? isActive;

  if (!item.items?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isNavItemActive(pathname, item.url)}
          tooltip={item.title}
          className="rounded-lg transition-colors duration-150 ease-out"
          render={<Link href={item.url} prefetch />}
        >
          <AppIcon icon={item.icon} />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        open={open}
        onOpenChange={setOpenOverride}
        className="group/collapsible"
      >
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isActive}
              className="rounded-lg transition-colors duration-150 ease-out"
            />
          }
        >
          <AppIcon icon={item.icon} />
          <span>{item.title}</span>
          <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 ease-out group-data-open/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-3.5 border-l border-sidebar-border/70 pl-2.5">
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={isNavItemActive(pathname, subItem.url)}
                  className="rounded-lg transition-colors duration-150 ease-out"
                  render={<Link href={subItem.url} prefetch />}
                >
                  <AppIcon icon={subItem.icon} className="size-4" />
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function NavMain() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {dashboardNav.map((item) => (
          <NavGroup key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
