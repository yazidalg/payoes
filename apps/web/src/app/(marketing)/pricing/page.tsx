import {
  ArrowLeftRight,
  Link2,
  QrCode,
  Receipt,
  Repeat,
  Webhook,
} from "lucide-react";
import type { Metadata } from "next";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { CTA } from "../cta";
import { Grid } from "../grid";
import { PricingCalculator } from "./pricing-calculator";

export const metadata: Metadata = {
  title: "Pricing - Payoes",
  description:
    "Pay for what you process. 1% per transaction across every Payoes product. No seat fees, no monthly plans, and a free sandbox on Stellar Testnet.",
};

type IncludedItem = {
  label: string;
  description: string;
  iconClass: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const INCLUDED: IncludedItem[] = [
  {
    label: "Crypto payments",
    description: "Accept USDC, XLM, and any Stellar asset with a single API call.",
    iconClass: "bg-gradient-to-b from-violet-500 to-violet-600",
    icon: ArrowLeftRight,
  },
  {
    label: "Checkout & payment links",
    description: "Hosted checkout pages and reusable links you can paste anywhere.",
    iconClass: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    icon: Link2,
  },
  {
    label: "Invoicing",
    description: "Draft, finalize, and get paid with hosted invoice pages.",
    iconClass: "bg-gradient-to-b from-orange-500 to-orange-600",
    icon: Receipt,
  },
  {
    label: "QR code checkout",
    description: "Free QR codes for every payment link and checkout session.",
    iconClass: "bg-gradient-to-b from-blue-500 to-blue-600",
    icon: QrCode,
  },
  {
    label: "Webhooks",
    description: "HMAC-signed events with automatic retries and delivery logs.",
    iconClass: "bg-gradient-to-b from-rose-500 to-rose-600",
    icon: Webhook,
  },
  {
    label: "Subscriptions",
    description: "Recurring billing that issues a finalized invoice each period.",
    iconClass: "bg-gradient-to-b from-indigo-500 to-indigo-600",
    icon: Repeat,
  },
];

const FAQS = [
  {
    question: "Is there a monthly fee?",
    answer:
      "No. Payoes is pay as you go: you are charged 1% per transaction and nothing else. There are no monthly fees, seat fees, or setup fees.",
  },
  {
    question: "How is the 1% charged?",
    answer:
      "It is deducted from each payment at settlement, on-chain. You keep 99% of every payment, and the fee is only ever applied to payments that succeed.",
  },
  {
    question: "Does Payoes hold my money?",
    answer:
      "No. Payments settle straight to your own Stellar wallet. Payoes is non-custodial and never holds your funds.",
  },
  {
    question: "Which assets can I accept?",
    answer:
      "USDC, XLM, and any Stellar asset your business works with. The same 1% rate applies across every asset.",
  },
  {
    question: "Is the sandbox free?",
    answer:
      "Yes. Build and test everything against Stellar Testnet in sandbox at no cost, then switch your API keys to production when you are ready.",
  },
  {
    question: "Can I self-host?",
    answer:
      "Yes. Payoes is open source, so you can audit, extend, or self-host the whole platform.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:py-32">
        <Grid
          id="pricing"
          cellSize={80}
          patternOffset={[1, -58]}
          className="text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          <div className="flex h-7 w-fit items-center rounded-full border border-neutral-200 bg-white px-4 text-xs font-medium text-neutral-800 shadow-sm">
            Pricing
          </div>
          <h1 className="font-display mt-6 text-balance text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.1]">
            Pay for what you process
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base text-neutral-600 sm:text-xl">
            No seat fees, no monthly plans. Just 1% of the payments you process,
            and you keep the other 99%.
          </p>
        </div>
      </section>

      {/* Interactive fee calculator */}
      <section className="px-4">
        <PricingCalculator />
      </section>

      {/* Everything included */}
      <section className="mt-24">
        <div className="mx-auto w-full max-w-xl px-4 text-center">
          <h2 className="font-display text-balance text-3xl font-medium text-neutral-900 sm:text-4xl">
            One rate. Every product.
          </h2>
          <p className="mt-3 text-lg text-neutral-500">
            The full Payoes platform is included in your 1%. No add-ons, no
            upsells, no locked features.
          </p>
        </div>

        <div className="mx-auto mt-14 grid w-full max-w-screen-lg grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map(({ label, description, icon: Icon, iconClass }) => (
            <div
              key={label}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg text-white",
                  iconClass,
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-base font-medium text-neutral-900">
                {label}
              </h3>
              <p className="mt-1.5 text-sm text-neutral-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-24">
        <div className="mx-auto w-full max-w-xl px-4 text-center">
          <h2 className="font-display text-balance text-3xl font-medium text-neutral-900 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-screen-lg grid-cols-1 gap-x-12 gap-y-8 px-4 sm:grid-cols-2">
          {FAQS.map(({ question, answer }) => (
            <div key={question}>
              <h3 className="text-base font-medium text-neutral-900">
                {question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <div className="mt-24">
        <CTA />
      </div>
    </>
  );
}
