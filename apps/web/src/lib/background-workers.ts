import {
  isSettlementStreamEnabled,
  startHorizonSettlementStream,
  stopHorizonSettlementStream,
} from "@/lib/payments/settlement/horizon-stream";
import { processDueWebhookRetries } from "@/lib/webhooks/delivery";

const WEBHOOK_RETRY_INTERVAL_MS = 5 * 60 * 1000;

let started = false;
let webhookRetryTimer: ReturnType<typeof setInterval> | null = null;

function runWebhookRetries() {
  void processDueWebhookRetries().catch((error) => {
    console.error("Webhook retry worker failed:", error);
  });
}

export function startBackgroundWorkers() {
  if (started) {
    return;
  }

  started = true;

  if (isSettlementStreamEnabled()) {
    void startHorizonSettlementStream();
  }

  runWebhookRetries();
  webhookRetryTimer = setInterval(runWebhookRetries, WEBHOOK_RETRY_INTERVAL_MS);
}

export function stopBackgroundWorkers() {
  if (webhookRetryTimer) {
    clearInterval(webhookRetryTimer);
    webhookRetryTimer = null;
  }

  stopHorizonSettlementStream();
  started = false;
}
