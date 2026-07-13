import { Check } from "lucide-react";
import { CodeTabs } from "./code-tabs";

const BULLETS = [
  {
    title: "Hosted checkout",
    description: "Spin up a payment page with a single API call.",
  },
  {
    title: "Real-time webhooks",
    description:
      "HMAC-signed payment events with automatic retries and delivery logs.",
  },
  {
    title: "Sandbox environment",
    description:
      "Build and test against Stellar Testnet, then switch your keys to Mainnet.",
  },
  {
    title: "Full request visibility",
    description:
      "Inspect every API call with built-in logs: endpoint, response, and timing.",
  },
];

export function Developers() {
  return (
    <section id="developers" className="px-4 py-24">
      <div className="mx-auto grid w-full max-w-screen-lg items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="flex h-7 w-fit items-center rounded-full border border-neutral-200 bg-white px-4 text-xs text-neutral-800">
            Payoes API
          </div>
          <h2 className="font-display mt-3 text-balance text-3xl font-medium text-neutral-900 sm:text-4xl">
            Payment infrastructure, not blockchain homework
          </h2>
          <p className="mt-4 text-pretty text-lg text-neutral-500">
            Programmatically create payments, links, invoices, and
            subscriptions with a REST API that feels familiar. One request
            returns a checkout URL; Payoes handles the rest.
          </p>

          <ul className="mt-8 flex flex-col gap-5">
            {BULLETS.map(({ title, description }) => (
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

        <CodeTabs />
      </div>
    </section>
  );
}
