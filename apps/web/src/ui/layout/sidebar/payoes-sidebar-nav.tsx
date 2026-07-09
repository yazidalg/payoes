"use client";

import {
  isNavItemActive,
  isPaymentsRoute,
} from "@/lib/navigation/dashboard-nav";
import type { Organization } from "@/lib/db/schema";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import {
  ArrowsOppositeDirectionX,
  BookOpen,
  Code,
  Cube,
  Gauge6,
  Gear2,
  Globe2,
  InvoiceDollar,
  Key,
  MoneyBill2,
  Refresh2,
  StackY3,
  Users,
  Users6,
  Webhook,
} from "@dub/ui/icons";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { SidebarNav, SidebarNavAreas, SidebarNavGroups } from "./sidebar-nav";

type SidebarNavData = {
  pathname: string;
  environment: Organization["environment"];
  showConversionGuides?: boolean;
  slug?: string;
};

const NAV_GROUPS: SidebarNavGroups<SidebarNavData> = ({ pathname }) => [
  {
    name: "Platform",
    description: "Manage payments, transactions, settlements, and customers.",
    icon: Gauge6,
    href: "/dashboard",
    active:
      !pathname.startsWith("/dashboard/settings") &&
      !pathname.startsWith("/dashboard/developers"),
  },
  {
    name: "Developers",
    description: "API keys, webhooks, logs, and documentation.",
    icon: Code,
    href: "/dashboard/developers/api-keys",
    active: pathname.startsWith("/dashboard/developers"),
  },
  {
    name: "Settings",
    description: "Organization, wallet, assets, and team settings.",
    icon: Gear2,
    href: "/dashboard/settings/organization",
    active: pathname.startsWith("/dashboard/settings"),
  },
];

const NAV_AREAS: SidebarNavAreas<SidebarNavData> = {
  platform: () => ({
    title: "Platform",
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Home",
            icon: Gauge6,
            href: "/dashboard",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Payments",
            icon: InvoiceDollar,
            href: "/dashboard/payments",
            isActive: (p) => isPaymentsRoute(p),
          },
          {
            name: "Transactions",
            icon: ArrowsOppositeDirectionX,
            href: "/dashboard/transactions",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Settlements",
            icon: Refresh2,
            href: "/dashboard/settlements",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Customers",
            icon: Users,
            href: "/dashboard/customers",
            isActive: (p, h) => isNavItemActive(p, h),
          },
        ],
      },
    ],
  }),
  developers: () => ({
    title: "Developers",
    direction: "left",
    content: [
      {
        items: [
          {
            name: "API Keys",
            icon: Key,
            href: "/dashboard/developers/api-keys",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Webhooks",
            icon: Webhook,
            href: "/dashboard/developers/webhooks",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "API Logs",
            icon: StackY3,
            href: "/dashboard/developers/api-logs",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Documentation",
            icon: BookOpen,
            href: "/dashboard/developers/documentation",
            isActive: (p, h) => isNavItemActive(p, h),
          },
        ],
      },
    ],
  }),
  settings: () => ({
    title: "Settings",
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Organization",
            icon: Globe2,
            href: "/dashboard/settings/organization",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Receiving Wallet",
            icon: MoneyBill2,
            href: "/dashboard/settings/receiving-wallet",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Assets",
            icon: Cube,
            href: "/dashboard/settings/assets",
            isActive: (p, h) => isNavItemActive(p, h),
          },
          {
            name: "Team Members",
            icon: Users6,
            href: "/dashboard/settings/team",
            isActive: (p, h) => isNavItemActive(p, h),
          },
        ],
      },
    ],
  }),
};

export function PayoesSidebarNav({
  toolContent,
  newsContent,
}: {
  toolContent?: ReactNode;
  newsContent?: ReactNode;
}) {
  const pathname = usePathname();
  const { activeOrganization } = useDashboardShell();

  const currentArea = useMemo(() => {
    if (pathname.startsWith("/dashboard/settings")) {
      return "settings";
    }

    if (pathname.startsWith("/dashboard/developers")) {
      return "developers";
    }

    return "platform";
  }, [pathname]);

  return (
    <SidebarNav
      groups={NAV_GROUPS}
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        pathname,
        environment: activeOrganization.environment,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
    />
  );
}
