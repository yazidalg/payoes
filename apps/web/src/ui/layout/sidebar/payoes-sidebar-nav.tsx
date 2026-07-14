"use client";

import {
  isNavItemActive,
  isPaymentsRoute,
} from "@/lib/navigation/dashboard-nav";
import {
  ArrowsOppositeDirectionX,
  BookOpen,
  Code,
  Gauge6,
  Gear2,
  Globe2,
  InvoiceDollar,
  Key,
  MoneyBill2,
  Refresh2,
  StackY3,
  User,
  Users6,
  Webhook,
} from "./icons";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { NavItemType, SidebarNav, SidebarSubmenu } from "./sidebar-nav";

const DEVELOPERS_SUBMENU_ID = "developers";
const SETTINGS_SUBMENU_ID = "settings";

function getDevelopersSubmenu(): SidebarSubmenu {
  return {
    id: DEVELOPERS_SUBMENU_ID,
    title: "Developers",
    backHref: "/dashboard",
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
  };
}

function getSettingsSubmenu(): SidebarSubmenu {
  return {
    id: SETTINGS_SUBMENU_ID,
    title: "Settings",
    backHref: "/dashboard",
    items: [
      {
        name: "Organization",
        icon: Globe2,
        href: "/dashboard/settings/organization",
        isActive: (p, h) => isNavItemActive(p, h),
      },
      {
        name: "Settlement Wallet",
        icon: MoneyBill2,
        href: "/dashboard/settings/settlement-wallet",
        isActive: (p, h) => isNavItemActive(p, h),
      },
      {
        name: "Team Members",
        icon: Users6,
        href: "/dashboard/settings/team",
        isActive: (p, h) => isNavItemActive(p, h),
      },
    ],
  };
}

function getMainNavItems(): NavItemType[] {
  return [
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
      icon: User,
      href: "/dashboard/customers",
      isActive: (p, h) => isNavItemActive(p, h),
    },
    {
      name: "Developers",
      icon: Code,
      href: "/dashboard/developers/api-keys",
      submenuId: DEVELOPERS_SUBMENU_ID,
      isActive: (p) => p.startsWith("/dashboard/developers"),
    },
    {
      name: "Settings",
      icon: Gear2,
      href: "/dashboard/settings/organization",
      submenuId: SETTINGS_SUBMENU_ID,
      isActive: (p) => p.startsWith("/dashboard/settings"),
    },
  ];
}

export function PayoesSidebarNav() {
  const pathname = usePathname();

  const activeSubmenu = useMemo(() => {
    if (pathname.startsWith("/dashboard/settings")) {
      return SETTINGS_SUBMENU_ID;
    }

    if (pathname.startsWith("/dashboard/developers")) {
      return DEVELOPERS_SUBMENU_ID;
    }

    return null;
  }, [pathname]);

  const submenus = useMemo(
    () => ({
      [DEVELOPERS_SUBMENU_ID]: getDevelopersSubmenu(),
      [SETTINGS_SUBMENU_ID]: getSettingsSubmenu(),
    }),
    [],
  );

  return (
    <SidebarNav
      mainItems={getMainNavItems()}
      submenus={submenus}
      activeSubmenu={activeSubmenu}
    />
  );
}
