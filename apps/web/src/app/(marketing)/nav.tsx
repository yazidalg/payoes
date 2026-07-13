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
import { useState } from "react";
import { cn } from "@/lib/utils";

const PRODUCT_ITEMS = [
  {
    label: "Crypto payments",
    description: "Accept USDC, XLM, and any Stellar asset",
    href: "/features/payments",
    icon: ArrowLeftRight,
  },
  {
    label: "Checkout & payment links",
    description: "Hosted checkout pages and shareable links",
    href: "/features/checkout",
    icon: Link2,
  },
  {
    label: "Invoicing",
    description: "Bill customers with hosted invoices",
    href: "/features/invoicing",
    icon: Receipt,
  },
  {
    label: "QR code checkout",
    description: "Free QR codes for every payment link",
    href: "/features/qr-checkout",
    icon: QrCode,
  },
  {
    label: "Webhooks",
    description: "HMAC-signed events with automatic retries",
    href: "/features/webhooks",
    icon: Webhook,
  },
];

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Developers", href: "/#developers" },
  { label: "Ecosystem", href: "/#logos" },
  { label: "Pricing", href: "/#cta" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

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
          <div
            className="relative"
            onMouseEnter={() => setProductOpen(true)}
            onMouseLeave={() => setProductOpen(false)}
          >
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

            {productOpen && (
              <div className="absolute left-1/2 top-full w-80 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                {PRODUCT_ITEMS.map(
                  ({ label, description, href, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setProductOpen(false)}
                      className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex size-9 flex-none items-center justify-center rounded-lg border border-neutral-200 bg-gradient-to-t from-neutral-100">
                        <Icon
                          className="size-4 text-neutral-700"
                          strokeWidth={1.75}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {label}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {description}
                        </p>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
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

      {open && (
        <nav className="flex flex-col border-t border-neutral-100 bg-white px-6 py-4 md:hidden">
          <p className="py-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Product
          </p>
          {PRODUCT_ITEMS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="py-2.5 pl-3 text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
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
      )}
    </header>
  );
}
