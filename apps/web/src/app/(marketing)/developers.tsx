import { Check } from "lucide-react";
import { CodeTabs } from "./code-tabs";

const BULLETS = [
  {
    title: "Real-time webhooks",
    description: "React to payments, refunds, and settlements instantly.",
  },
  {
    title: "Multi-language SDKs",
    description: "TypeScript, Python, and more, with typed responses.",
  },
  {
    title: "Hosted checkout",
    description: "Spin up a payment page with a single API call.",
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
            Enterprise-grade payment infrastructure
          </h2>
          <p className="mt-4 text-pretty text-lg text-neutral-500">
            Programmatically create payments, links, and subscriptions.
            Integrate stablecoin checkout into your product in minutes.
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
