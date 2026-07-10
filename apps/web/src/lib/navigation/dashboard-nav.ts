import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  Coins,
  Code2,
  CreditCard,
  FileCode2,
  KeyRound,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";
import type { Organization } from "@/lib/db/schema";

export type DashboardNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
};

export const dashboardNav: DashboardNavItem[] = [
  {
    title: "Home",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Payments",
    url: "/dashboard/payments",
    icon: CreditCard,
  },
  {
    title: "Transactions",
    url: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Settlements",
    url: "/dashboard/settlements",
    icon: RefreshCw,
  },
  {
    title: "Customers",
    url: "/dashboard/customers",
    icon: Users,
  },
  {
    title: "Developers",
    url: "/dashboard/developers/api-keys",
    icon: Code2,
    items: [
      {
        title: "API Keys",
        url: "/dashboard/developers/api-keys",
        icon: KeyRound,
      },
      {
        title: "Webhooks",
        url: "/dashboard/developers/webhooks",
        icon: Webhook,
      },
      {
        title: "API Logs",
        url: "/dashboard/developers/api-logs",
        icon: FileCode2,
      },
      {
        title: "Documentation",
        url: "/dashboard/developers/documentation",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Settings",
    url: "/dashboard/settings/organization",
    icon: Settings,
    items: [
      {
        title: "Organization",
        url: "/dashboard/settings/organization",
        icon: Building2,
      },
      {
        title: "Settlement Wallet",
        url: "/dashboard/settings/settlement-wallet",
        icon: Wallet,
      },
      {
        title: "Payment Methods",
        url: "/dashboard/settings/payment-methods",
        icon: Coins,
      },
      {
        title: "Team Members",
        url: "/dashboard/settings/team",
        icon: Users,
      },
    ],
  },
];

export function getSettingsNavItems(_environment: Organization["environment"]) {
  const settingsGroup = dashboardNav.find((item) => item.title === "Settings");

  return settingsGroup?.items ?? [];
}

export function getDashboardNav(environment: Organization["environment"]) {
  return dashboardNav.map((item) => {
    if (item.title !== "Settings" || !item.items) {
      return item;
    }

    return {
      ...item,
      items: getSettingsNavItems(environment),
    };
  });
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/payments": "Payments",
  "/dashboard/transactions": "Transactions",
  "/dashboard/settlements": "Settlements",
  "/dashboard/customers": "Customers",
  "/dashboard/developers/api-keys": "API Keys",
  "/dashboard/developers/webhooks": "Webhooks",
  "/dashboard/developers/api-logs": "API Logs",
  "/dashboard/developers/documentation": "Documentation",
  "/dashboard/settings/organization": "Organization",
  "/dashboard/settings/settlement-wallet": "Settlement Wallet",
  "/dashboard/settings/payment-methods": "Payment Methods",
  "/dashboard/settings/assets": "Payment Methods",
  "/dashboard/settings/team": "Team Members",
};

export function getDashboardPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/payments/pay_")) {
    return "Payment Intent Detail";
  }

  if (
    pathname.startsWith("/dashboard/payments/checkout-sessions/") &&
    pathname !== "/dashboard/payments/checkout-sessions"
  ) {
    return "Checkout Session Detail";
  }

  if (
    pathname.startsWith("/dashboard/payments/links/") &&
    pathname !== "/dashboard/payments/links"
  ) {
    return "Payment Link Detail";
  }

  if (
    pathname.startsWith("/dashboard/payments/invoices/") &&
    pathname !== "/dashboard/payments/invoices"
  ) {
    return pathname.endsWith("/new") ? "Create Invoice" : "Invoice Detail";
  }

  if (pathname.startsWith("/dashboard/customers/") && pathname !== "/dashboard/customers") {
    return "Customer Detail";
  }

  if (
    pathname.startsWith("/dashboard/developers/api-keys/") &&
    pathname !== "/dashboard/developers/api-keys"
  ) {
    return "API Key Detail";
  }

  if (
    pathname.startsWith("/dashboard/developers/webhooks/") &&
    pathname !== "/dashboard/developers/webhooks"
  ) {
    return pathname.endsWith("/edit")
      ? "Webhook Configuration"
      : "Webhook Detail";
  }

  return pageTitles[pathname] ?? "Dashboard";
}

export function isPaymentsRoute(pathname: string) {
  return (
    pathname === "/dashboard/payments" ||
    pathname.startsWith("/dashboard/payments/")
  );
}

export function isNavItemActive(pathname: string, url: string) {
  if (url === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (url === "/dashboard/payments") {
    return isPaymentsRoute(pathname);
  }

  if (url === "/dashboard/customers") {
    return pathname === url || pathname.startsWith("/dashboard/customers/");
  }

  if (url === "/dashboard/developers/api-keys") {
    return (
      pathname === url || pathname.startsWith("/dashboard/developers/api-keys/")
    );
  }

  if (url === "/dashboard/developers/webhooks") {
    return (
      pathname === url || pathname.startsWith("/dashboard/developers/webhooks/")
    );
  }

  return pathname === url;
}

export function isNavGroupActive(pathname: string, item: DashboardNavItem) {
  if (isNavItemActive(pathname, item.url)) {
    return true;
  }

  return item.items?.some((subItem) => isNavItemActive(pathname, subItem.url)) ?? false;
}
