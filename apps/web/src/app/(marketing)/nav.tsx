"use client";

import {
  ArrowLeftRight,
  ChevronDown,
  Link2,
  Menu,
  QrCode,
  Receipt,
  Webhook,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  InvoiceGraphic,
  PaymentLinksGraphic,
  PaymentsGraphic,
  QRGraphic,
  WebhooksGraphic,
} from "./feature-graphics";

type ProductItem = {
  label: string;
  description: string;
  href: string;
  iconClass: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  graphic: ComponentType;
  /* Gradient wash revealed behind the card on hover (accent -> transparent). */
  washClass: string;
  /* Colored drop shadow on the icon tile on hover. */
  glowClass: string;
  /* Accent border color on hover. */
  borderClass: string;
};

const PRODUCT_ITEMS: ProductItem[] = [
  {
    label: "Crypto payments",
    description: "Accept USDC, XLM, and any Stellar asset",
    href: "/features/payments",
    iconClass: "bg-gradient-to-b from-violet-500 to-violet-600",
    icon: ArrowLeftRight,
    graphic: PaymentsGraphic,
    washClass: "from-violet-500/[0.08] via-violet-500/[0.02]",
    glowClass: "group-hover/item:shadow-violet-500/50",
    borderClass: "group-hover/item:border-violet-200",
  },
  {
    label: "Checkout & payment links",
    description: "Hosted checkout pages and shareable links",
    href: "/features/checkout",
    iconClass: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    icon: Link2,
    graphic: PaymentLinksGraphic,
    washClass: "from-emerald-500/[0.08] via-emerald-500/[0.02]",
    glowClass: "group-hover/item:shadow-emerald-500/50",
    borderClass: "group-hover/item:border-emerald-200",
  },
  {
    label: "Invoicing",
    description: "Bill customers with hosted invoices",
    href: "/features/invoicing",
    iconClass: "bg-gradient-to-b from-orange-500 to-orange-600",
    icon: Receipt,
    graphic: InvoiceGraphic,
    washClass: "from-orange-500/[0.08] via-orange-500/[0.02]",
    glowClass: "group-hover/item:shadow-orange-500/50",
    borderClass: "group-hover/item:border-orange-200",
  },
  {
    label: "QR code checkout",
    description: "Free QR codes for every payment link",
    href: "/features/qr-checkout",
    iconClass: "bg-gradient-to-b from-blue-500 to-blue-600",
    icon: QrCode,
    graphic: QRGraphic,
    washClass: "from-blue-500/[0.08] via-blue-500/[0.02]",
    glowClass: "group-hover/item:shadow-blue-500/50",
    borderClass: "group-hover/item:border-blue-200",
  },
  {
    label: "Webhooks",
    description: "HMAC-signed events with automatic retries",
    href: "/features/webhooks",
    iconClass: "bg-gradient-to-b from-rose-500 to-rose-600",
    icon: Webhook,
    graphic: WebhooksGraphic,
    washClass: "from-rose-500/[0.08] via-rose-500/[0.02]",
    glowClass: "group-hover/item:shadow-rose-500/50",
    borderClass: "group-hover/item:border-rose-200",
  },
];

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Developers", href: "/developers" },
  { label: "Docs", href: "/docs" },
  { label: "Ecosystem", href: "/#logos" },
  { label: "Pricing", href: "/#cta" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!productOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!productRef.current?.contains(event.target as Node)) {
        setProductOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () =>
      document.removeEventListener("mousedown", handlePointerDown);
  }, [productOpen]);

  function renderProductCard(
    item: ProductItem,
    index: number,
    variant: "top" | "bottom",
  ) {
    const {
      label,
      description,
      href,
      icon: Icon,
      iconClass,
      graphic: Graphic,
      washClass,
      glowClass,
      borderClass,
    } = item;
    return (
      <Link
        key={label}
        href={href}
        onClick={() => setProductOpen(false)}
        style={{
          transitionProperty: "opacity, transform, border-color, box-shadow",
          transitionDuration: "300ms",
          transitionTimingFunction: "ease-out",
          // Stagger only the reveal; keep hover feedback instant.
          transitionDelay: productOpen
            ? `${index * 40}ms, ${index * 40}ms, 0ms, 0ms`
            : "0ms",
        }}
        className={cn(
          "group/item relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-900/5",
          borderClass,
          variant === "top" ? "col-span-2" : "col-span-3",
          productOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-1 opacity-0",
        )}
      >
        {/* Accent gradient wash, faded in on hover. */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 z-0 bg-gradient-to-b to-transparent opacity-0 transition-opacity duration-300 group-hover/item:opacity-100",
            washClass,
          )}
        />
        <div className="relative z-10 flex items-start gap-3 p-4">
          <div
            className={cn(
              "flex size-9 flex-none items-center justify-center rounded-lg text-white shadow-sm shadow-transparent transition-all duration-300 group-hover/item:-rotate-3 group-hover/item:scale-110 group-hover/item:shadow-lg",
              iconClass,
              glowClass,
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{label}</p>
            <p className="text-xs text-neutral-500">{description}</p>
          </div>
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none relative z-10 overflow-hidden transition-transform duration-500 ease-out group-hover/item:scale-[1.03]",
            variant === "top" ? "h-36" : "h-28",
          )}
        >
          {/* Graphics are authored for a ~520x302 container (feature pages).
              Render them at that size, then scale each variant down to the
              card width and clip with the fixed-height parent above. */}
          <div
            className={cn(
              "absolute left-0 top-0 h-[302px] w-[520px] origin-top-left",
              variant === "top" ? "scale-[0.585]" : "scale-[0.89]",
            )}
          >
            <Graphic />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <header className="sticky inset-x-0 top-0 z-50 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-2xl font-black tracking-tight text-neutral-900"
        >
          Payoes
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <div className="relative" ref={productRef}>
            <button
              type="button"
              onClick={() => setProductOpen((prev) => !prev)}
              aria-expanded={productOpen}
              className="flex items-center gap-1 py-5 text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
              Product
              <ChevronDown
                className={cn(
                  "size-3.5 text-neutral-400 transition-transform",
                  productOpen && "rotate-180",
                )}
                strokeWidth={2.5}
              />
            </button>

            <div className="absolute left-1/2 top-full -translate-x-1/2 pt-1">
              <div
                className={cn(
                  "w-[960px] max-w-[calc(100vw-2rem)] origin-top rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl transition-all duration-200 ease-out",
                  productOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-95 opacity-0",
                )}
              >
                <div className="grid grid-cols-6 gap-3">
                  {PRODUCT_ITEMS.slice(0, 3).map((item, index) =>
                    renderProductCard(item, index, "top"),
                  )}
                  {PRODUCT_ITEMS.slice(3).map((item, index) =>
                    renderProductCard(item, index + 3, "bottom"),
                  )}
                </div>
              </div>
            </div>
          </div>

          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Sign up
          </Link>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 transition-colors hover:bg-neutral-50 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-out md:hidden",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <nav className="flex min-h-0 flex-col overflow-hidden border-t border-neutral-100 bg-white px-6 py-4">
          <p className="py-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Product
          </p>
          {PRODUCT_ITEMS.map(({ label, href, icon: Icon, iconClass }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 py-2.5 pl-3 text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded text-white",
                  iconClass,
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              {label}
            </Link>
          ))}
          <div className="my-2 border-t border-neutral-100" />
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
