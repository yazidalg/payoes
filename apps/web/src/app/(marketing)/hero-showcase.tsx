"use client";

import {
  BarChart3,
  Check,
  Compass,
  Info,
  Layers,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    label: "Payment Links",
    icon: Link2,
    iconClass: "bg-gradient-to-b from-violet-500 to-violet-600",
  },
  {
    label: "Conversion Analytics",
    icon: BarChart3,
    iconClass: "bg-gradient-to-b from-emerald-500 to-emerald-600",
  },
  {
    label: "Subscriptions",
    icon: RefreshCw,
    iconClass: "bg-gradient-to-b from-orange-500 to-orange-600",
  },
];

export function HeroShowcase() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative mt-28 w-full">
      {/* Full-bleed neutral surface with a straight top edge. The shelf's top is
          flush with this edge and the whole shelf hangs downward into the
          surface, so the concave fillets flare with nothing above them. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-neutral-100 [mask-image:linear-gradient(black_80%,transparent)]">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-24 sm:px-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.10)]">
            <Dashboard />
          </div>
        </div>
      </div>

      {/* Tab shelf hanging downward into the surface: its top is flush with the
          surface edge, its bottom is rounded, and concave fillets at the top
          corners sweep the surface down into the shelf's vertical sides. */}
      <div className="absolute left-1/2 top-0 z-20 w-fit -translate-x-1/2 rounded-b-[1.75rem] bg-white px-10 pb-3">
        <div className="flex items-center pt-4">
          {TABS.map(({ label, icon: Icon, iconClass }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center whitespace-nowrap rounded-xl border px-4 py-2 text-[14px] font-semibold",
                active === i
                  ? "border-neutral-200 bg-white text-neutral-900 shadow-[0_10px_28px_-16px_rgba(0,0,0,0.20)] mx-4"
                  : "border-transparent bg-gray-100 mx-2 text-neutral-500 mx-4",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded mx-2 text-white",
                  iconClass,
                )}
              >
                <Icon className="size-4 shadow-[0_10px_28px_-16px_rgba(0,0,0,1)]" strokeWidth={2} />
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* Concave fillets at the surface top edge (flush with the shelf top),
            sweeping the gray surface down into the shelf's vertical sides. */}
        <span
          aria-hidden
          className="absolute left-0 top-0 h-10 w-10 -translate-x-full"
          style={{
            background: `radial-gradient(circle at bottom left, transparent 40px, #ffffff 40px)`,
          }}
        />
        <span
          aria-hidden
          className="absolute right-0 top-0 h-10 w-10 translate-x-full"
          style={{
            background: `radial-gradient(circle at bottom right, transparent 40px, #ffffff 40px)`,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------ Dashboard ------------------------------ */

const NAV_MAIN = [
  { label: "Overview", icon: Info },
  { label: "Payouts", icon: Wallet, badge: "0" },
  { label: "Messages", icon: MessageSquare, badge: "4" },
];

const NAV_PARTNERS = [
  { label: "All partners", icon: Users },
  { label: "Groups", icon: Layers },
  { label: "Partner Network", icon: Compass },
  { label: "Applications", icon: UserPlus, badge: "3", active: true },
];

const NAV_INSIGHTS = [
  { label: "Analytics", icon: BarChart3 },
  { label: "Commissions", icon: Receipt },
  { label: "Fraud Detection", icon: ShieldAlert, badge: "3" },
];

const ROWS = [
  {
    name: "Mia Thompson",
    date: "Dec 12, 2025",
    flag: "🇺🇸",
    country: "United States",
    handle: "@mia.thomp.son",
    verified: true,
    selected: true,
  },
  {
    name: "Ethan Brooks",
    date: "Dec 12, 2025",
    flag: "🇨🇦",
    country: "Canada",
    handle: "@ethan_brooks_CAN",
    verified: true,
    selected: false,
  },
  {
    name: "Jessica Coleman",
    date: "Dec 12, 2025",
    flag: "🇺🇸",
    country: "United States",
    handle: "-",
    verified: false,
    selected: false,
  },
];

function Dashboard() {
  return (
    <div className="flex h-[420px] min-w-[820px] text-left">
      {/* App icon rail */}
      <div className="flex w-14 flex-none flex-col items-center gap-4 border-r border-neutral-200 py-4">
        <span className="font-display text-lg font-black tracking-tight text-neutral-900">
          P
        </span>
        <div className="mt-2 flex flex-col items-center gap-3">
          <RailIcon>
            <div className="size-5 rounded-full bg-gradient-to-b from-neutral-700 to-black" />
          </RailIcon>
          <RailIcon>
            <Compass className="size-5 text-neutral-500" strokeWidth={1.75} />
          </RailIcon>
          <RailIcon active>
            <Layers className="size-5 text-neutral-900" strokeWidth={1.75} />
          </RailIcon>
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex w-52 flex-none flex-col gap-5 border-r border-neutral-200 px-3 py-4">
        <h3 className="px-2 text-[15px] font-semibold text-neutral-900">
          Partner Program
        </h3>
        <NavGroup items={NAV_MAIN} />
        <NavGroup title="Partners" items={NAV_PARTNERS} />
        <NavGroup title="Insights" items={NAV_INSIGHTS} />
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h2 className="text-[17px] font-semibold text-neutral-900">
          Applications
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <div className="flex h-9 items-center rounded-lg border border-neutral-200 pl-9 text-sm text-neutral-400">
            Search by name or email
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200">
          {/* Selection toolbar */}
          <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-2.5">
            <span className="flex size-4 items-center justify-center rounded bg-neutral-900 text-white">
              <div className="h-0.5 w-2 rounded-full bg-white" />
            </span>
            <span className="text-sm font-medium text-neutral-900">
              1 selected
            </span>
            <button className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
              Approve
            </button>
            <button className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-900">
              Reject
            </button>
          </div>

          {ROWS.map((row) => (
            <Row key={row.name} {...row} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RailIcon({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center rounded-lg",
        active && "border border-neutral-200 bg-neutral-50 shadow-sm",
      )}
    >
      {children}
    </div>
  );
}

function NavGroup({
  title,
  items,
}: {
  title?: string;
  items: {
    label: string;
    icon: typeof Info;
    badge?: string;
    active?: boolean;
  }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {title && (
        <p className="px-2 pb-1 text-xs font-medium text-neutral-400">
          {title}
        </p>
      )}
      {items.map(({ label, icon: Icon, badge, active }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
            active
              ? "bg-blue-50 font-medium text-blue-600"
              : "text-neutral-600",
          )}
        >
          <Icon
            className={cn("size-4", active ? "text-blue-600" : "text-neutral-400")}
            strokeWidth={1.75}
          />
          <span className="flex-1">{label}</span>
          {badge && (
            <span
              className={cn(
                "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium",
                active
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-500",
              )}
            >
              {badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({
  name,
  date,
  flag,
  country,
  handle,
  verified,
  selected,
}: {
  name: string;
  date: string;
  flag: string;
  country: string;
  handle: string;
  verified: boolean;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0",
        selected && "bg-neutral-50/60",
      )}
    >
      <span
        className={cn(
          "flex size-4 flex-none items-center justify-center rounded border",
          selected
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300 bg-white",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>

      <div className="flex w-44 flex-none items-center gap-2">
        <div className="size-6 flex-none rounded-full bg-gradient-to-b from-orange-300 to-orange-400" />
        <span className="font-medium text-neutral-900">{name}</span>
      </div>

      <span className="w-24 flex-none text-neutral-500">{date}</span>

      <span className="flex w-40 flex-none items-center gap-2 text-neutral-600">
        <span>{flag}</span>
        {country}
      </span>

      <span className="flex flex-1 items-center gap-1.5 text-neutral-500">
        {handle}
        {verified && (
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        )}
      </span>

      <MoreHorizontal className="size-4 flex-none text-neutral-400" />
    </div>
  );
}
