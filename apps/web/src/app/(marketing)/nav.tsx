"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const NAV_LINKS: { label: string; href: string; hasMenu?: boolean }[] = [
  { label: "Product", href: "#features", hasMenu: true },
  { label: "Solutions", href: "#features", hasMenu: true },
  { label: "Resources", href: "#developers", hasMenu: true },
  { label: "Enterprise", href: "#developers" },
  { label: "Customers", href: "#logos" },
  { label: "Pricing", href: "#cta" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

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
          {NAV_LINKS.map(({ label, href, hasMenu }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-1 text-[15px] font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
              {label}
              {hasMenu && (
                <ChevronDown
                  className="size-3.5 text-neutral-400"
                  strokeWidth={2.5}
                />
              )}
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
