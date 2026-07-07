import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  Code2,
  CreditCard,
  FileCode2,
  KeyRound,
  Link2,
  ScrollText,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";

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
    title: "Payments",
    url: "/dashboard/payments",
    icon: CreditCard,
    items: [
      {
        title: "All Payments",
        url: "/dashboard/payments",
        icon: ScrollText,
      },
      {
        title: "Payment Links",
        url: "/dashboard/payments/links",
        icon: Link2,
      },
      {
        title: "Checkout Sessions",
        url: "/dashboard/payments/checkout-sessions",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "Transactions",
    url: "/dashboard/transactions",
    icon: ArrowLeftRight,
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
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
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
        title: "Receiving Wallet",
        url: "/dashboard/settings/receiving-wallet",
        icon: Wallet,
      },
      {
        title: "Team Members",
        url: "/dashboard/settings/team",
        icon: Users,
      },
      {
        title: "Billing",
        url: "/dashboard/settings/billing",
        icon: CreditCard,
      },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/payments": "All Payments",
  "/dashboard/payments/links": "Payment Links",
  "/dashboard/payments/checkout-sessions": "Checkout Sessions",
  "/dashboard/transactions": "Transactions",
  "/dashboard/customers": "Customers",
  "/dashboard/developers/api-keys": "API Keys",
  "/dashboard/developers/webhooks": "Webhooks",
  "/dashboard/developers/api-logs": "API Logs",
  "/dashboard/developers/documentation": "Documentation",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings/organization": "Organization",
  "/dashboard/settings/receiving-wallet": "Receiving Wallet",
  "/dashboard/settings/team": "Team Members",
  "/dashboard/settings/billing": "Billing",
};

export function getDashboardPageTitle(pathname: string) {
  return pageTitles[pathname] ?? "Dashboard";
}

export function isNavItemActive(pathname: string, url: string) {
  return pathname === url;
}

export function isNavGroupActive(pathname: string, item: DashboardNavItem) {
  if (isNavItemActive(pathname, item.url)) {
    return true;
  }

  return item.items?.some((subItem) => isNavItemActive(pathname, subItem.url)) ?? false;
}
