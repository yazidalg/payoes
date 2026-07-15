import Link from "next/link";
import { Wordmark } from "@dub/ui";

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Payments", href: "/features/payments" },
      { label: "Payment Links", href: "/features/checkout" },
      { label: "Invoices", href: "/features/invoicing" },
      { label: "Subscriptions", href: "/#features" },
      { label: "Checkout", href: "/features/checkout" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "API Reference", href: "/developers" },
      { label: "Webhooks", href: "/features/webhooks" },
      { label: "GitHub", href: "https://github.com/payoes/payoes" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
      { label: "Ecosystem", href: "/ecosystem" },
    ],
  },
];

const SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: "GitHub",
    href: "https://github.com/payoes/payoes",
    path: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z",
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-screen-lg px-4 py-16 lg:px-4 xl:px-0">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              className="inline-block rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Wordmark className="h-6 overflow-visible" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-neutral-500">
              Stellar payment infrastructure for modern teams.
            </p>
          </div>

          {FOOTER_COLUMNS.map(({ title, links }) => (
            <div key={title}>
              <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-neutral-200 pt-8 sm:flex-row">
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Payoes, Inc.
          </p>
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ label, href, path }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-400 transition-colors hover:text-neutral-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5"
                  aria-hidden
                >
                  <path d={path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
