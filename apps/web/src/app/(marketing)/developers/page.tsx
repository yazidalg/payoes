import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "../button-link";
import { CodeTabs } from "../code-tabs";
import { DarkCta } from "../dark-cta";
import { Grid } from "../grid";

const ACCENT = "bg-gradient-to-b from-indigo-500 to-indigo-600";

export const metadata: Metadata = {
  title: "Developers - Payoes",
  description:
    "Every Payoes feature starts with an API. Create payments, payment links, invoices, and customers from your codebase, and let Payoes handle the blockchain.",
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
    endpoint: "GET /v1/checkout-sessions/{id}",
    prefix: "cs_",
    description:
      "Retrieve hosted checkout sessions created from finalized invoices or payment link visits.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-100/50 to-indigo-200/80" />
        <Grid
          id="developers-hero"
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="animate-slide-up-fade mx-auto flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]">
            <span className={`size-2 rounded-full ${ACCENT}`} />
            Payoes API
          </div>
          <h1 className="font-display animate-slide-up-fade mt-6 text-balance text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.1] [--offset:20px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both]">
            Built for developers first
          </h1>
          <p className="animate-slide-up-fade mt-5 max-w-2xl text-balance text-base text-neutral-600 sm:text-lg [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]">
            Every Payoes feature starts with an API. Create payments, checkout
            sessions, payment links, invoices, and customers from your
            codebase, and let Payoes handle the blockchain.
          </p>
          <div className="xs:flex-row animate-slide-up-fade mt-8 flex max-w-fit flex-col items-center gap-4 [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]">
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
          <h2 className="font-display animate-slide-up-fade text-center text-3xl font-medium text-neutral-900 [--offset:10px] [animation-duration:700ms] [animation-fill-mode:both]">
            One request to get paid
          </h2>
          <p className="animate-slide-up-fade mx-auto mt-4 max-w-xl text-center text-neutral-500 [--offset:10px] [animation-delay:100ms] [animation-duration:700ms] [animation-fill-mode:both]">
            Create a payment and share the checkout URL it returns. Wallet
            connection, on-chain verification, and settlement are handled for
            you.
          </p>
          <div className="animate-slide-up-fade mt-10 [--offset:15px] [animation-delay:200ms] [animation-duration:700ms] [animation-fill-mode:both]">
            <CodeTabs />
          </div>
        </div>
      </section>

      {/* API resources */}
      <section id="resources" className="scroll-mt-24 px-4 py-20">
        <div className="mx-auto w-full max-w-screen-lg">
          <h2 className="font-display animate-slide-up-fade text-center text-3xl font-medium text-neutral-900 [--offset:10px] [animation-duration:700ms] [animation-fill-mode:both]">
            Five resources, one predictable API
          </h2>
          <p className="animate-slide-up-fade mx-auto mt-4 max-w-xl text-center text-neutral-500 [--offset:10px] [animation-delay:100ms] [animation-duration:700ms] [animation-fill-mode:both]">
            Stripe-style objects and IDs, Bearer key authentication, and JSON
            everywhere. If you have integrated a payment API before, you
            already know this one.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RESOURCES.map(({ name, endpoint, prefix, description }, index) => (
              <div
                key={name}
                style={{ animationDelay: `${index * 80 + 150}ms` }}
                className="animate-slide-up-fade flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-5 transition-all duration-200 [--offset:15px] [animation-fill-mode:both] hover:-translate-y-0.5 hover:shadow-md"
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
            <div
              style={{ animationDelay: `${RESOURCES.length * 80 + 150}ms` }}
              className="animate-slide-up-fade flex flex-col justify-center gap-2 rounded-xl border border-dashed border-neutral-300 p-5 text-center [--offset:15px] [animation-fill-mode:both]"
            >
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
          <h2 className="font-display animate-slide-up-fade text-center text-3xl font-medium text-neutral-900 [--offset:10px] [animation-duration:700ms] [animation-fill-mode:both]">
            Everything around the API
          </h2>
          <ul className="mx-auto mt-12 grid max-w-screen-md gap-x-12 gap-y-6 sm:grid-cols-2">
            {TOOLING.map(({ title, description }, index) => (
              <li
                key={title}
                style={{ animationDelay: `${index * 80 + 150}ms` }}
                className="group animate-slide-up-fade flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 [--offset:15px] [animation-fill-mode:both] hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform duration-200 group-hover:scale-110">
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

      <DarkCta
        id="developers-cta"
        badge="Payoes API"
        accentClassName={ACCENT}
        title="Ship your integration this afternoon"
      />
    </>
  );
}
