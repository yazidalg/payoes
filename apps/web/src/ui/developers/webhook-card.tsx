import Link from "next/link";
import type { WebhookEndpointRow } from "@/lib/webhooks/types";
import { WebhookAvatar } from "@/ui/developers/webhook-avatar";
import { WebhookStatus } from "@/ui/developers/webhook-status";

function getWebhookLabel(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function WebhookCard({ endpoint }: { endpoint: WebhookEndpointRow }) {
  return (
    <Link
      href={`/dashboard/developers/webhooks/${endpoint.id}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-[filter]"
    >
      <div className="flex items-center gap-x-3">
        <div className="flex-shrink-0 rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
          <WebhookAvatar id={endpoint.url} />
        </div>
        <div className="min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-neutral-700">
              {getWebhookLabel(endpoint.url)}
            </span>
            <WebhookStatus endpoint={endpoint} />
          </div>
          <div className="truncate text-sm text-neutral-500">{endpoint.url}</div>
        </div>
      </div>
    </Link>
  );
}
