import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "../button-link";
import { CodeTabs } from "../code-tabs";
import { Grid } from "../grid";

export const metadata: Metadata = {
  title: "Developers - Payoes",
  description:
    "Every Payoes feature starts with an API. Create payments, checkout sessions, payment links, invoices, and customers from your codebase, and let Payoes handle the blockchain.",
};

const RESOURCES = [
  {
    name: "Payments",
    endpoint: "POST /v1/payments",
    prefix: "pay_",
    description:
      "Create a payment and get back a hosted checkout URL. Track status from created to completed.",
  },
  {
    name: "Checkout Sessions",
    endpoint: "POST /v1/checkout-sessions",
    prefix: "cs_",
    description:
      "Wrap a payment in a hosted checkout flow with line items and customer fields.",
  },
  {
    name: "Payment Links",
    endpoint: "POST /v1/payment-links",
    prefix: "plink_",
    description:
      "Reusable links that spawn a fresh checkout session on every visit.",
  },
  {
    name: "Invoices",
    endpoint: "POST /v1/invoices",
    prefix: "inv_",
    description:
      "Draft, finalize, and collect invoices with hosted payment pages.",
  },
  {
    name: "Customers",
    endpoint: "POST /v1/customers",
    prefix: "cus_",
    description:
      "Organize payers with profiles, wallet addresses, and payment history.",
  },
];

const TOOLING = [
  {
    title: "Environment-scoped API keys",
    description:
      "pk_test_ keys hit Stellar Testnet, pk_live_ keys hit Mainnet. Keys never cross environments and can be revoked at any time.",
  },
  {
    title: "Scoped permissions",
    description:
      "Grant each key read or write access per resource, from payments to customers. Requests outside a key's scope are rejected.",
  },
  {
    title: "API logs",
    description:
      "Every request is logged with method, path, status code, and duration, inspectable in the dashboard.",
  },
  {
    title: "HMAC-signed webhooks",
    description:
      "Payment lifecycle events signed with your endpoint secret and retried automatically for up to 24 hours.",
  },
  {
    title: "Free sandbox",
    description:
      "A full Testnet environment for every organization. Test the entire payment flow end to end before going live.",
  },
  {
    title: "Open source",
    description:
      "Audit the code, contribute, or self-host the entire platform.",
  },
];

export default function DevelopersPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <Grid
          id="developers-hero"
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="mx-auto flex h-7 w-fit items-center rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm">
            Payoes API
          </div>
          <h1 className="font-display mt-6 text-balance text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.1]">
            Built for developers first
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-neutral-600 sm:text-lg">
            Every Payoes feature starts with an API. Create payments, checkout
            sessions, payment links, invoices, and customers from your
            codebase, and let Payoes handle the blockchain.
          </p>
          <div className="xs:flex-row mt-8 flex max-w-fit flex-col items-center gap-4">
            <ButtonLink variant="primary" href="/register">
              Get your API keys
            </ButtonLink>
            <ButtonLink variant="secondary" href="#resources">
              Browse the API
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Code example */}
      <section className="px-4">
        <div className="mx-auto w-full max-w-screen-md">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            One request to get paid
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">
            Create a payment and share the checkout URL it returns. Wallet
            connection, on-chain verification, and settlement are handled for
            you.
          </p>
          <div className="mt-10">
            <CodeTabs />
          </div>
        </div>
      </section>

      {/* API resources */}
      <section id="resources" className="scroll-mt-24 px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            Five resources, one predictable API
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">
            Stripe-style objects and IDs, Bearer key authentication, and JSON
            everywhere. If you have integrated a payment API before, you
            already know this one.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RESOURCES.map(({ name, endpoint, prefix, description }) => (
              <div
                key={name}
                className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-medium text-neutral-900">
                    {name}
                  </h3>
                  <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-600">
                    {prefix}
                  </span>
                </div>
                <p className="font-mono text-xs text-neutral-500">{endpoint}</p>
                <p className="text-sm text-neutral-500">{description}</p>
              </div>
            ))}
            <div className="flex flex-col justify-center gap-2 rounded-xl border border-dashed border-neutral-300 p-5 text-center">
              <p className="text-sm font-medium text-neutral-900">
                Webhooks included
              </p>
              <p className="text-sm text-neutral-500">
                React to every payment event in real time.
              </p>
              <Link
                href="/features/webhooks"
                className="text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
              >
                Learn about webhooks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tooling */}
      <section className="border-y border-neutral-200 bg-neutral-50/60 px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display text-center text-3xl font-medium text-neutral-900">
            Everything around the API
          </h2>
          <ul className="mx-auto mt-12 grid max-w-screen-md gap-x-12 gap-y-6 sm:grid-cols-2">
            {TOOLING.map(({ title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                  <Check className="size-3" strokeWidth={3} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {title}
                  </p>
                  <p className="text-sm text-neutral-500">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 pt-20 text-center">
        <h2 className="font-display text-balance text-3xl font-medium text-neutral-900">
          Ship your integration this afternoon
        </h2>
        <p className="mt-4 text-neutral-500">
          Free sandbox on Stellar Testnet. No credit card required.
        </p>
        <div className="xs:flex-row mx-auto mt-8 flex max-w-fit flex-col items-center gap-4">
          <ButtonLink variant="primary" href="/register">
            Start for free
          </ButtonLink>
          <ButtonLink variant="secondary" href="/#features">
            See all features
          </ButtonLink>
        </div>
        <div className="mt-10">
          <Link
            href="/"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            &larr; Back to home
          </Link>
        </div>
      </section>
    </>
  );
}
