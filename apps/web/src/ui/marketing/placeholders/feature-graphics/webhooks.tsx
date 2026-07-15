import type { WebhookEndpointRow } from "@/lib/webhooks/types";
import { WebhookCard } from "@/ui/developers/webhook-card";
import { CSSProperties } from "react";

const DEMO_WEBHOOKS: WebhookEndpointRow[] = [
  {
    id: "wh_demo_primary",
    url: "https://api.acme.co/webhooks/payoes",
    events: ["payment.completed", "payment.failed"],
    enabled: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "wh_demo_secondary",
    url: "https://hooks.acme.co/payoes",
    events: ["payment.completed", "invoice.paid"],
    enabled: 1,
    createdAt: "2026-07-02T00:00:00.000Z",
  },
  {
    id: "wh_demo_staging",
    url: "https://staging.acme.co/webhooks/payoes",
    events: ["webhook.test"],
    enabled: 0,
    createdAt: "2026-07-03T00:00:00.000Z",
  },
];

export function Webhooks() {
  return (
    <div className="flex size-full flex-col justify-center" aria-hidden>
      <div className="flex flex-col gap-2.5 [mask-image:linear-gradient(90deg,black_70%,transparent)]">
        {DEMO_WEBHOOKS.map((endpoint, idx) => (
          <div
            key={endpoint.id}
            className="transition-transform duration-300 hover:translate-x-[-2%]"
          >
            <div
              className="ml-[calc((var(--idx)+1)*5%)]"
              style={{ "--idx": idx } as CSSProperties}
            >
              <WebhookCard endpoint={endpoint} interactive={false} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
