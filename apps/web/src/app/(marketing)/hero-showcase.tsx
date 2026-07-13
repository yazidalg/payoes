"use client";

import {
  ArrowLeftRight,
  ArrowUpDown,
  Check,
  Info,
  KeyRound,
  Link2,
  MoreHorizontal,
  Plus,
  Receipt,
  ScrollText,
  Search,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Native size of the dashboard mockup below (min-w-[820px] x h-[420px]). On
// screens narrower than this the whole mockup is scaled down uniformly so it
// stays fully visible instead of overflowing.
const DASHBOARD_WIDTH = 820;
const DASHBOARD_HEIGHT = 420;

const TABS = [
  {
    label: "Payments",
    icon: ArrowLeftRight,
    iconClass: "bg-gradient-to-b from-violet-500 to-violet-600",
  },
  {
    label: "Hosted Checkout",
    icon: Wallet,
    iconClass: "bg-gradient-to-b from-emerald-500 to-emerald-600",
  },
  {
    label: "Invoices",
    icon: Receipt,
    iconClass: "bg-gradient-to-b from-orange-500 to-orange-600",
  },
];

export function HeroShowcase() {
  const [active, setActive] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setScale(width >= DASHBOARD_WIDTH ? 1 : width / DASHBOARD_WIDTH);
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative mt-16 w-full sm:mt-28">
      {/* Full-bleed neutral surface with a straight top edge. The shelf's top is
          flush with this edge and the whole shelf hangs downward into the
          surface, so the concave fillets flare with nothing above them. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-neutral-100 [mask-image:linear-gradient(black_80%,transparent)]">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-16 sm:px-6 sm:pt-24">
          <div
            ref={cardRef}
            className="overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.10)]"
          >
            {/* Scale-to-fit wrapper: on desktop scale is 1 and the dashboard fills
                the card as before; on narrow screens it shrinks uniformly and the
                wrapper height collapses with it so there is no empty gap. */}
            <div style={{ height: DASHBOARD_HEIGHT * scale }}>
              <div
                style={{
                  width: scale < 1 ? DASHBOARD_WIDTH : "100%",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <Dashboard view={active} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab shelf hanging downward into the surface: its top is flush with the
          surface edge, its bottom is rounded, and concave fillets at the top
          corners sweep the surface down into the shelf's vertical sides. */}
      <div className="absolute left-1/2 top-0 z-20 w-fit -translate-x-1/2 rounded-b-[1.75rem] bg-white px-4 pb-3 sm:px-10">
        <div className="flex items-center pt-4">
          {TABS.map(({ label, icon: Icon, iconClass }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "mx-1 flex items-center whitespace-nowrap rounded-xl border px-3 py-2 text-[14px] font-semibold sm:mx-4 sm:px-4",
                active === i
                  ? "border-neutral-200 bg-white text-neutral-900 shadow-[0_10px_28px_-16px_rgba(0,0,0,0.20)]"
                  : "border-transparent bg-gray-100 text-neutral-500",
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
              <span className="hidden sm:inline">{label}</span>
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
  { label: "Payments", icon: ArrowLeftRight, view: 0 },
  { label: "Transactions", icon: ArrowUpDown },
  { label: "Payment Links", icon: Link2 },
  { label: "Invoices", icon: Receipt, view: 2 },
  { label: "Customers", icon: Users },
];

const NAV_DEVELOPERS = [
  { label: "API Keys", icon: KeyRound },
  { label: "Webhooks", icon: Webhook, badge: "2" },
  { label: "API Logs", icon: ScrollText },
];

const PAYMENT_ROWS = [
  {
    id: "pay_9tK4mQx8",
    customer: "mia@acme.co",
    asset: "USDC",
    amount: "49.99",
    status: "Completed",
    date: "Jul 14",
  },
  {
    id: "pay_7hW2xLp3",
    customer: "ethan@northwind.io",
    asset: "XLM",
    amount: "120.00",
    status: "Completed",
    date: "Jul 14",
  },
  {
    id: "pay_5rN8vDk6",
    customer: "jess@lumen.app",
    asset: "USDC",
    amount: "310.50",
    status: "Pending",
    date: "Jul 13",
  },
  {
    id: "pay_2mB6cFj9",
    customer: "liam@cobalt.dev",
    asset: "USDC",
    amount: "18.00",
    status: "Expired",
    date: "Jul 12",
  },
];

const INVOICE_ROWS = [
  {
    id: "inv_8pR3sVn2",
    customer: "Acme Inc.",
    amount: "116.00 USDC",
    status: "Paid",
    due: "Jul 20",
  },
  {
    id: "inv_6dJ9wYt5",
    customer: "Northwind Labs",
    amount: "480.00 USDC",
    status: "Open",
    due: "Jul 28",
  },
  {
    id: "inv_4gF7zQm1",
    customer: "Lumen Studio",
    amount: "89.00 USDC",
    status: "Draft",
    due: "-",
  },
];

const STATUS_STYLES: Record<string, string> = {
  Completed: "border-emerald-100 bg-emerald-50 text-emerald-600",
  Paid: "border-emerald-100 bg-emerald-50 text-emerald-600",
  Pending: "border-amber-100 bg-amber-50 text-amber-600",
  Open: "border-blue-100 bg-blue-50 text-blue-600",
  Draft: "border-neutral-200 bg-neutral-50 text-neutral-500",
  Expired: "border-neutral-200 bg-neutral-50 text-neutral-500",
};

function Dashboard({ view }: { view: number }) {
  return (
    <div className="flex h-[420px] min-w-[820px] text-left">
      {/* Sidebar */}
      <div className="flex w-52 flex-none flex-col gap-5 border-r border-neutral-200 px-3 py-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-neutral-900 font-display text-sm font-black text-white">
              P
            </span>
            <h3 className="text-[15px] font-semibold text-neutral-900">
              Acme Inc.
            </h3>
          </div>
        </div>
        <div className="mx-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5">
          <span className="text-xs font-medium text-amber-700">Sandbox</span>
          <span className="text-[10px] text-amber-600">Testnet</span>
        </div>
        <NavGroup items={NAV_MAIN} view={view} />
        <NavGroup title="Developers" items={NAV_DEVELOPERS} view={view} />
      </div>

      {/* Main */}
      {view === 1 ? <CheckoutView /> : <TableView view={view} />}
    </div>
  );
}

function TableView({ view }: { view: number }) {
  const isInvoices = view === 2;

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-neutral-900">
          {isInvoices ? "Invoices" : "Payments"}
        </h2>
        <button className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">
          <Plus className="size-3.5" strokeWidth={2.5} />
          {isInvoices ? "Create invoice" : "Create payment"}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <div className="flex h-9 items-center rounded-lg border border-neutral-200 pl-9 text-sm text-neutral-400">
          {isInvoices
            ? "Search by customer or invoice ID"
            : "Search by customer or payment ID"}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        {isInvoices
          ? INVOICE_ROWS.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0"
              >
                <span className="w-32 flex-none font-mono text-neutral-800">
                  {row.id}
                </span>
                <span className="flex-1 truncate text-neutral-600">
                  {row.customer}
                </span>
                <span className="w-28 flex-none text-right font-medium text-neutral-900">
                  {row.amount}
                </span>
                <StatusBadge status={row.status} />
                <span className="w-14 flex-none text-right text-neutral-500">
                  {row.due}
                </span>
                <MoreHorizontal className="size-4 flex-none text-neutral-400" />
              </div>
            ))
          : PAYMENT_ROWS.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0"
              >
                <span className="w-28 flex-none font-mono text-neutral-800">
                  {row.id}
                </span>
                <span className="flex-1 truncate text-neutral-500">
                  {row.customer}
                </span>
                <span className="flex-none rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {row.asset}
                </span>
                <span className="w-16 flex-none text-right font-medium text-neutral-900">
                  {row.amount}
                </span>
                <StatusBadge status={row.status} />
                <span className="w-12 flex-none text-right text-neutral-500">
                  {row.date}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}

function CheckoutView() {
  return (
    <div className="flex flex-1 items-center justify-center bg-neutral-50/60 p-6">
      <div className="w-[340px] rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-gradient-to-b from-orange-300 to-orange-400" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Acme Inc.</p>
            <p className="text-xs text-neutral-500">Pro plan</p>
          </div>
        </div>

        <p className="font-display mt-5 text-3xl font-medium text-neutral-900">
          49.99 <span className="text-lg text-neutral-500">USDC</span>
        </p>

        <div className="mt-5 flex gap-2">
          {["USDC", "XLM"].map((asset, i) => (
            <div
              key={asset}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium",
                i === 0
                  ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                  : "border-neutral-200 text-neutral-500",
              )}
            >
              {i === 0 && <Check className="size-3.5" strokeWidth={3} />}
              {asset}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white">
          <Wallet className="size-4" strokeWidth={2} />
          Connect wallet
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Pay from any Stellar wallet. No account needed.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "w-24 flex-none rounded-md border px-2 py-0.5 text-center text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

function NavGroup({
  title,
  items,
  view,
}: {
  title?: string;
  items: {
    label: string;
    icon: typeof Info;
    badge?: string;
    view?: number;
  }[];
  view: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      {title && (
        <p className="px-2 pb-1 text-xs font-medium text-neutral-400">
          {title}
        </p>
      )}
      {items.map(({ label, icon: Icon, badge, view: itemView }) => {
        // The checkout tab is a hosted page, not a dashboard section, so
        // "Payments" stays highlighted while it is shown.
        const active =
          itemView === view || (view === 1 && itemView === 0);
        return (
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
              className={cn(
                "size-4",
                active ? "text-blue-600" : "text-neutral-400",
              )}
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
        );
      })}
    </div>
  );
}
