import { ArrowUpRight, BookOpen, Rocket, Server, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "../button-link";
import { DarkCta } from "../dark-cta";
import { Grid } from "../grid";

const ACCENT = "bg-gradient-to-b from-amber-500 to-amber-600";

export const metadata: Metadata = {
  title: "Documentation - Payoes",
  description:
    "Guides, quickstart, and API reference for accepting USDC and XLM payments on Stellar with Payoes.",
};

const DOCS_REPO_URL = "https://github.com/payoes/payoes/tree/main/docs";

const GUIDE_GROUPS = [
  {
    title: "Get started",
    icon: Rocket,
    href: "/docs/get-started",
    accent: "bg-gradient-to-b from-amber-500 to-amber-600",
    pages: [
      {
        name: "Introduction",
        description: "What Payoes is and how the pieces fit together.",
      },
      {
        name: "Quickstart",
        description: "Create your first payment on Stellar Testnet.",
      },
    ],
  },
  {
    title: "Core concepts",
    icon: BookOpen,
    href: "/docs/core-concepts",
    accent: "bg-gradient-to-b from-indigo-500 to-indigo-600",
    pages: [
      {
        name: "Concepts & object model",
        description: "Payments, sessions, links, invoices, and their IDs.",
      },
      {
        name: "Authentication",
        description: "Bearer API keys and how scopes are enforced.",
      },
      {
        name: "Environments",
        description: "Sandbox on Testnet, production on Mainnet.",
      },
      {
        name: "Customers",
        description: "Organize payers and their payment history.",
      },
    ],
  },
  {
    title: "Payments",
    icon: Wallet,
    href: "/docs/payments",
    accent: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    pages: [
      {
        name: "Checkout",
        description: "Hosted pages, wallet connection, and QR payments.",
      },
      {
        name: "Settlement wallet",
        description: "Where your funds land and how to configure it.",
      },
      {
        name: "Webhooks",
        description: "Signed events, retries, and signature verification.",
      },
      {
        name: "Error handling",
        description: "Status codes and how to recover gracefully.",
      },
    ],
  },
  {
    title: "Self-hosting",
    icon: Server,
    href: "/docs/self-hosting",
    accent: "bg-gradient-to-b from-teal-500 to-teal-600",
    pages: [
      {
        name: "Local setup",
        description: "Run the whole platform with Docker and Postgres.",
      },
      {
        name: "Environment variables",
        description: "Every knob, documented.",
      },
      {
        name: "Webhook retry worker",
        description: "Schedule the retry cron for reliable delivery.",
      },
      {
        name: "KYC verification",
        description: "Wire up Persona for organization verification.",
      },
    ],
  },
];

const API_GROUPS = [
  {
    name: "Payments",
    endpoints: ["GET /payments", "POST /payments", "GET /payments/{id}"],
  },
  {
    name: "Customers",
    endpoints: ["GET /customers", "POST /customers", "GET /customers/{id}"],
  },
  {
    name: "Checkout sessions",
    endpoints: [
      "GET /checkout-sessions",
      "POST /checkout-sessions",
      "GET /checkout-sessions/{id}",
    ],
  },
  {
    name: "Payment links",
    endpoints: [
      "GET /payment-links",
      "POST /payment-links",
      "GET /payment-links/{id}",
    ],
  },
  {
    name: "Invoices",
    endpoints: [
      "GET /invoices",
      "POST /invoices",
      "GET /invoices/{id}",
      "POST /invoices/{id}/finalize",
    ],
  },
];

const QUICKSTART_STEPS = [
  {
    title: "Create a sandbox API key",
    description:
      "In the dashboard, go to Developers, then API Keys, and create a sandbox key. It uses the pk_test_ prefix and is shown only once.",
  },
  {
    title: "Create a payment",
    description:
      "One POST request returns a payment ID and a hosted checkout URL to share with your customer.",
  },
  {
    title: "Pay on Testnet",
    description:
      "Open the checkout URL, connect a Stellar Testnet wallet, and approve the transaction with test funds.",
  },
  {
    title: "Receive the webhook",
    description:
      "Payoes verifies the payment on-chain, marks it completed, and delivers a signed payment.completed event.",
  },
];

const QUICKSTART_SNIPPET = `curl -X POST https://payoes.com/api/v1/payments \\
  -H "Authorization: Bearer pk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "10.00",
    "settlement_asset": "USDC"
  }'`;

export default function DocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-100/50 to-amber-200/80" />
        <Grid
          id="docs-hero"
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="mx-auto flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm">
            <span className={`size-2 rounded-full ${ACCENT}`} />
            Documentation
          </div>
          <h1 className="font-display mt-6 text-balance text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.1]">
            Learn, integrate, ship
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-neutral-600 sm:text-lg">
            Guides, a five-minute quickstart, and a full API reference for
            accepting USDC and XLM payments on Stellar.
          </p>
          <div className="xs:flex-row mt-8 flex max-w-fit flex-col items-center gap-4">
            <ButtonLink variant="primary" href="#quickstart">
              Quickstart
            </ButtonLink>
            <ButtonLink variant="secondary" href="#api-reference">
              API reference
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section id="quickstart" className="scroll-mt-24 px-4 py-20">
        <div className="mx-auto grid w-full max-w-screen-lg items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-medium text-neutral-900">
              From zero to paid in five minutes
            </h2>
            <p className="mt-4 text-lg text-neutral-500">
              The quickstart walks you through the full loop on Stellar
              Testnet, with nothing at stake.
            </p>
            <ol className="mt-8 flex flex-col gap-5">
              {QUICKSTART_STEPS.map(({ title, description }, idx) => (
                <li key={title} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${ACCENT}`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {title}
                    </p>
                    <p className="text-sm text-neutral-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl">
            <div className="border-b border-neutral-800 px-5 py-3 font-mono text-xs text-neutral-400">
              Create a sandbox payment
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-neutral-200">
              {QUICKSTART_SNIPPET}
            </pre>
          </div>
        </div>
      </section>

      {/* Guides */}
      <section className="border-y border-neutral-200 bg-neutral-50/60 px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            Guides
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">
            Everything from core concepts to running Payoes on your own
            infrastructure.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {GUIDE_GROUPS.map(({ title, icon: Icon, href, accent, pages }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-lg text-white transition-transform duration-300 group-hover:scale-110 ${accent}`}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-base font-medium text-neutral-900">
                      {title}
                    </h3>
                  </div>
                  <ArrowUpRight className="size-4 text-neutral-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <ul className="flex flex-col gap-2.5">
                  {pages.map(({ name, description }) => (
                    <li key={name} className="text-sm">
                      <span className="font-medium text-neutral-800">
                        {name}
                      </span>
                      <span className="text-neutral-500"> {description}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* API reference */}
      <section id="api-reference" className="scroll-mt-24 px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            API reference
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">
            Authenticate with a Bearer API key against{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] text-neutral-800">
              /api/v1
            </code>
            . Sandbox keys use pk_test_, production keys use pk_live_.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {API_GROUPS.map(({ name, endpoints }) => (
              <div
                key={name}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5"
              >
                <h3 className="text-base font-medium text-neutral-900">
                  {name}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {endpoints.map((endpoint) => (
                    <li
                      key={endpoint}
                      className="font-mono text-xs text-neutral-500"
                    >
                      {endpoint}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 p-5 text-center">
              <p className="text-sm font-medium text-neutral-900">
                Full OpenAPI spec
              </p>
              <p className="text-sm text-neutral-500">
                Request and response schemas for every endpoint.
              </p>
              <a
                href={`${DOCS_REPO_URL}/openapi/v1.yaml`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <DarkCta
        id="docs-cta"
        badge="Documentation"
        accentClassName={ACCENT}
        title="Ready to build?"
        description="Grab a sandbox key and make your first request in minutes."
      />
    </>
  );
}
