"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { EnvironmentModeBanner } from "@/components/dashboard/environment-mode";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { Organization } from "@/lib/db/schema";
import { getDashboardPageTitle } from "@/lib/navigation/dashboard-nav";

export function DashboardShell({
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
  const pathname = usePathname();
  const pageTitle = getDashboardPageTitle(pathname);
  const [activeOrganization, setActiveOrganization] = useState(
    initialActiveOrganization
  );

  useEffect(() => {
    setActiveOrganization(initialActiveOrganization);
  }, [initialActiveOrganization]);

  return (
    <div className="bg-sidebar flex h-svh w-full flex-col overflow-hidden">
      {activeOrganization ? (
        <EnvironmentModeBanner
          organization={activeOrganization}
          onOrganizationUpdated={setActiveOrganization}
        />
      ) : null}

      <SidebarProvider className="bg-sidebar !min-h-0 h-0 min-h-0 flex-1 overflow-hidden">
        <AppSidebar
          user={user}
          organizations={organizations}
          activeOrganization={activeOrganization}
          onOrganizationChange={setActiveOrganization}
          collapsible={
            activeOrganization?.environment === "sandbox" ? "none" : "icon"
          }
        />
        <SidebarInset className="bg-sidebar m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="border-border bg-card mb-2 min-h-0 flex-1 overflow-hidden rounded-tl-4xl border-l">
            <div className="h-full overflow-y-auto p-4 md:p-6">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
