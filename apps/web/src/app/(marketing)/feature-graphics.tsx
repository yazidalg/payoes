"use client";

import {
  Check,
  Copy,
  Download,
  Globe,
  HelpCircle,
  MousePointerClick,
  Sparkles,
  Webhook,
} from "lucide-react";
import { CSSProperties, useState } from "react";
import { cn } from "@/lib/utils";

/* Small toggle mirroring the reference's Switch (orange track when on). */
function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
        checked ? "bg-orange-600" : "bg-neutral-200",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

/* ----------------------------- Payment links ---------------------------- */

const LINKS = [
  { domain: "pay.acme.co/pro", volume: "$15.6K", primary: true },
  { domain: "acme.li/checkout", volume: "$3.7K" },
  { domain: "acme.me/donate", volume: "$2.4K" },
];

export function PaymentLinksGraphic() {
  return (
    <div className="flex size-full flex-col justify-center" aria-hidden>
      <div className="flex flex-col gap-2.5 [mask-image:linear-gradient(90deg,black_70%,transparent)]">
        {LINKS.map(({ domain, volume, primary }, idx) => (
          <div
            key={domain}
            className="transition-transform duration-300 hover:translate-x-[-2%]"
          >
            <div
              className="ml-[calc((var(--idx)+1)*5%)] flex cursor-default items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              style={{ "--idx": idx } as CSSProperties}
            >
              <div className="flex-none rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2">
                <Globe className="size-6 text-neutral-500" strokeWidth={1.75} />
              </div>

              <span className="text-base font-medium text-neutral-900">
                {domain}
              </span>

              <div className="ml-2 flex items-center gap-x-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-[0.2rem]">
                <MousePointerClick className="h-4 w-4 text-neutral-700" />
                <div className="flex items-center whitespace-nowrap text-sm text-neutral-500">
                  {volume}
                  <span className="ml-1 hidden sm:inline-block">paid</span>
                </div>
              </div>

              {primary && (
                <div className="flex items-center gap-x-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-[0.2rem]">
                  <Sparkles className="h-4 w-4 text-blue-700" />
                  <div className="flex items-center whitespace-nowrap text-sm text-blue-600">
                    Primary
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- QR code ------------------------------- */

export function QRGraphic() {
  const [hideLogo, setHideLogo] = useState(false);

  return (
    <div className="size-full [mask-image:linear-gradient(black_70%,transparent)]">
      <div
        className="mx-3.5 flex origin-top scale-95 cursor-default flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_20px_20px_0_#00000017]"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">QR Code Design</h3>
          <div className="max-md:hidden">
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
              Q
            </kbd>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">
                QR Code Preview
              </span>
              <HelpCircle className="size-4 text-neutral-500" />
            </div>
            <div className="flex h-6 items-center gap-3 px-1">
              <Download className="size-4 text-neutral-500" />
              <Copy className="size-4 text-neutral-500" />
            </div>
          </div>
          <div className="relative mt-2 flex h-40 items-center justify-center overflow-hidden rounded-md border border-neutral-300">
            <div className="relative flex size-full items-center justify-center">
              <QRCode hideLogo={hideLogo} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700">Logo</span>
            <HelpCircle className="size-4 text-neutral-500" />
          </div>
          <Switch checked={!hideLogo} onChange={(checked) => setHideLogo(!checked)} />
        </div>
      </div>
    </div>
  );
}

function QRCode({ hideLogo }: { hideLogo: boolean }) {
  return (
    <svg width="128" height="128" viewBox="0 0 29 29">
      <path fill="#fff" d="M0 0h29v29H0z" shapeRendering="crispEdges" />
      <path
        d="M2 2h7v1H2zM10 2h1v1H10zM12 2h2v1H12zM17 2h1v1H17zM20,2 h7v1H20zM2 3h1v1H2zM8 3h1v1H8zM11 3h1v1H11zM13 3h3v1H13zM17 3h1v1H17zM20 3h1v1H20zM26,3 h1v1H26zM2 4h1v1H2zM4 4h3v1H4zM8 4h1v1H8zM10 4h2v1H10zM18 4h1v1H18zM20 4h1v1H20zM22 4h3v1H22zM26,4 h1v1H26zM2 5h1v1H2zM4 5h3v1H4zM8 5h1v1H8zM10 5h1v1H10zM13 5h2v1H13zM17 5h2v1H17zM20 5h1v1H20zM22 5h3v1H22zM26,5 h1v1H26zM2 6h1v1H2zM4 6h3v1H4zM8 6h1v1H8zM12 6h2v1H12zM17 6h2v1H17zM20 6h1v1H20zM22 6h3v1H22zM26,6 h1v1H26zM2 7h1v1H2zM8 7h1v1H8zM10 7h4v1H10zM15 7h1v1H15zM17 7h2v1H17zM20 7h1v1H20zM26,7 h1v1H26zM2 8h7v1H2zM10 8h1v1H10zM12 8h1v1H12zM14 8h1v1H14zM16 8h1v1H16zM18 8h1v1H18zM20,8 h7v1H20zM10 9h1v1H10zM12 9h1v1H12zM14 9h1v1H14zM16 9h1v1H16zM3 10h1v1H3zM5 10h1v1H5zM7 10h5v1H7zM13 10h3v1H13zM17 10h1v1H17zM19 10h3v1H19zM23 10h2v1H23zM26,10 h1v1H26zM3 11h4v1H3zM10 11h1v1H10zM12 11h1v1H12zM15 11h2v1H15zM19 11h3v1H19zM26,11 h1v1H26zM2 12h1v1H2zM7 12h2v1H7zM11 12h2v1H11zM14 12h3v1H14zM19 12h1v1H19zM21 12h2v1H21zM25,12 h2v1H25zM2 13h3v1H2zM6 13h1v1H6zM13 13h1v1H13zM15 13h1v1H15zM20 13h1v1H20zM22 13h1v1H22zM3 14h1v1H3zM6 14h4v1H6zM13 14h2v1H13zM16 14h1v1H16zM19 14h2v1H19zM23 14h1v1H23zM25,14 h2v1H25zM11 15h1v1H11zM14 15h2v1H14zM20 15h2v1H20zM23 15h2v1H23zM26,15 h1v1H26zM2 16h1v1H2zM4 16h1v1H4zM7 16h2v1H7zM10 16h1v1H10zM16 16h1v1H16zM20 16h3v1H20zM24 16h1v1H24zM26,16 h1v1H26zM3 17h1v1H3zM6 17h1v1H6zM10 17h1v1H10zM12 17h1v1H12zM15 17h3v1H15zM19 17h1v1H19zM22 17h1v1H22zM25 17h1v1H25zM2 18h2v1H2zM8 18h2v1H8zM11 18h1v1H11zM13 18h2v1H13zM18 18h7v1H18zM10 19h1v1H10zM14 19h1v1H14zM16 19h1v1H16zM18 19h1v1H18zM22 19h2v1H22zM26,19 h1v1H26zM2 20h7v1H2zM10 20h5v1H10zM16 20h3v1H16zM20 20h1v1H20zM22 20h2v1H22zM25,20 h2v1H25zM2 21h1v1H2zM8 21h1v1H8zM10 21h1v1H10zM15 21h2v1H15zM18 21h1v1H18zM22 21h4v1H22zM2 22h1v1H2zM4 22h3v1H4zM8 22h1v1H8zM11 22h1v1H11zM14 22h1v1H14zM18 22h6v1H18zM26,22 h1v1H26zM2 23h1v1H2zM4 23h3v1H4zM8 23h1v1H8zM10 23h2v1H10zM14 23h2v1H14zM18 23h1v1H18zM21 23h4v1H21zM2 24h1v1H2zM4 24h3v1H4zM8 24h1v1H8zM11 24h2v1H11zM14 24h1v1H14zM16 24h3v1H16zM21 24h2v1H21zM24 24h1v1H24zM26,24 h1v1H26zM2 25h1v1H2zM8 25h1v1H8zM10 25h1v1H10zM12 25h1v1H12zM14 25h2v1H14zM17 25h4v1H17zM23 25h1v1H23zM2 26h7v1H2zM12 26h4v1H12zM18 26h2v1H18zM21 26h1v1H21zM25,26 h2v1H25z"
        shapeRendering="crispEdges"
      />
      <rect
        width="7.35"
        height="7.2"
        x="10.9"
        y="10.9"
        fill="#fff"
        className={cn("transition-opacity", hideLogo && "opacity-0")}
      />
      <g className={cn("transition-opacity", hideLogo && "opacity-0")}>
        <rect
          width="6.25"
          height="6.25"
          x="11.375"
          y="11.375"
          rx="1.4"
          fill="#171717"
        />
        <text
          x="14.5"
          y="15.6"
          textAnchor="middle"
          fontSize="4.4"
          fontWeight="700"
          fontFamily="var(--font-satoshi), sans-serif"
          fill="#fff"
        >
          P
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------- Invoicing ------------------------------ */

const INVOICE_ITEMS = [
  { label: "Pro plan (monthly)", amount: "89.00 USDC" },
  { label: "Additional seats x 3", amount: "27.00 USDC" },
];

export function InvoiceGraphic() {
  return (
    <div
      className="size-full overflow-clip [mask-image:linear-gradient(black_70%,transparent)]"
      aria-hidden
    >
      <div className="mx-3.5 flex cursor-default flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_20px_20px_0_#00000017]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-medium">Invoice</h3>
            <p className="mt-0.5 font-mono text-xs text-neutral-500">
              inv_9tK4mQx82L
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
            <Check className="size-3.5" strokeWidth={3} />
            Paid
          </span>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-neutral-100 pt-3">
          {INVOICE_ITEMS.map(({ label, amount }) => (
            <div
              key={label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-neutral-600">{label}</span>
              <span className="font-medium text-neutral-900">{amount}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
          <span className="text-sm font-medium text-neutral-900">
            Total due
          </span>
          <span className="font-display text-lg font-medium text-neutral-900">
            116.00 USDC
          </span>
        </div>

        <div className="rounded-lg bg-neutral-900 py-2 text-center text-sm font-medium text-white">
          Pay invoice
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Webhooks ------------------------------- */

const DELIVERIES = [
  { event: "payment.completed", status: "200 OK", ok: true, time: "2s ago" },
  { event: "payment.created", status: "200 OK", ok: true, time: "1m ago" },
  { event: "payment.failed", status: "Retrying", ok: false, time: "6m ago" },
  { event: "payment.expired", status: "200 OK", ok: true, time: "18m ago" },
];

export function WebhooksGraphic() {
  return (
    <div
      className="size-full overflow-clip [mask-image:linear-gradient(black_70%,transparent)]"
      aria-hidden
    >
      <div className="mx-3.5 flex cursor-default flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_20px_20px_0_#00000017]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium">Webhook deliveries</h3>
          <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1">
            <Webhook className="size-3.5 text-neutral-500" />
            <span className="whitespace-nowrap font-mono text-xs text-neutral-500">
              acme.co/webhooks
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {DELIVERIES.map(({ event, status, ok, time }) => (
            <div
              key={event}
              className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 p-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    ok ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                <span className="font-mono text-sm text-neutral-800">
                  {event}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium",
                    ok
                      ? "border border-emerald-100 bg-emerald-50 text-emerald-600"
                      : "border border-amber-100 bg-amber-50 text-amber-600",
                  )}
                >
                  {status}
                </span>
                <span className="hidden whitespace-nowrap text-xs text-neutral-400 sm:inline">
                  {time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Payment processing -------------------------- */

const PAYMENTS = [
  {
    id: "pay_9tK4mQx8",
    customer: "mia@acme.co",
    asset: "USDC",
    amount: "49.99",
    status: "Completed",
  },
  {
    id: "pay_7hW2xLp3",
    customer: "ethan@northwind.io",
    asset: "XLM",
    amount: "120.00",
    status: "Completed",
  },
  {
    id: "pay_5rN8vDk6",
    customer: "jess@lumen.app",
    asset: "USDC",
    amount: "310.50",
    status: "Pending",
  },
  {
    id: "pay_2mB6cFj9",
    customer: "liam@cobalt.dev",
    asset: "USDC",
    amount: "18.00",
    status: "Expired",
  },
];

const STATUS_STYLES: Record<string, string> = {
  Completed: "border-emerald-100 bg-emerald-50 text-emerald-600",
  Pending: "border-amber-100 bg-amber-50 text-amber-600",
  Expired: "border-neutral-200 bg-neutral-50 text-neutral-500",
};

export function PaymentsGraphic() {
  return (
    <div
      aria-hidden
      className="size-full select-none [mask-image:linear-gradient(black_60%,transparent)]"
    >
      <div className="relative mx-3.5 h-full overflow-hidden rounded-t-xl border-x border-t border-neutral-200 bg-white shadow-[0_20px_20px_0_#00000017]">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Total volume
            </p>
            <p className="font-display text-2xl font-medium text-neutral-900">
              $48,214.90
            </p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "Payments", value: "7.2K" },
              { label: "Customers", value: "1.9K" },
              { label: "Success", value: "98.4%" },
            ].map(({ label, value }) => (
              <div key={label} className="text-right">
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-sm font-medium text-neutral-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          {PAYMENTS.map(({ id, customer, asset, amount, status }) => (
            <div
              key={id}
              className="flex items-center gap-3 border-b border-neutral-100 px-6 py-3.5 text-sm last:border-b-0 sm:gap-4"
            >
              <span className="w-28 flex-none font-mono text-neutral-800 sm:w-32">
                {id}
              </span>
              <span className="hidden flex-1 truncate text-neutral-500 sm:inline">
                {customer}
              </span>
              <span className="flex-none rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {asset}
              </span>
              <span className="w-16 flex-none text-right font-medium text-neutral-900 sm:w-20">
                {amount}
              </span>
              <span
                className={cn(
                  "w-24 flex-none rounded-md border px-2 py-0.5 text-center text-xs font-medium",
                  STATUS_STYLES[status],
                )}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
