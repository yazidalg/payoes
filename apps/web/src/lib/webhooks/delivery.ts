import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  webhookDeliveries,
  webhookEndpoints,
  type Organization,
  type WebhookDelivery,
} from "@/lib/db/schema";
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
} from "@/constants/webhooks/retry";
import { buildWebhookHeaders } from "@/lib/webhooks/signing";
import type { WebhookEvent } from "@/constants/webhooks/events";

type DispatchableWebhookEvent = WebhookEvent | "webhook.test";

function buildWebhookBody(event: string, payload: Record<string, unknown>) {
  return JSON.stringify({
    event,
    data: payload,
  });
}

function getRetryDelayMs(attemptNumber: number) {
  const index = Math.min(
    Math.max(attemptNumber - 1, 0),
    WEBHOOK_RETRY_DELAYS_MS.length - 1
  );
  return WEBHOOK_RETRY_DELAYS_MS[index]!;
}

export async function dispatchWebhookEvent(input: {
  organizationId: string;
  environment: Organization["environment"];
  event: WebhookEvent;
  payload: Record<string, unknown>;
}) {
  await processDueWebhookRetries();

  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.organizationId, input.organizationId),
        eq(webhookEndpoints.environment, input.environment)
      )
    );

  const matching = endpoints.filter(
    (endpoint) => endpoint.enabled === 1 && endpoint.events.includes(input.event)
  );

  await Promise.all(
    matching.map((endpoint) =>
      enqueueWebhookDelivery({
        endpointId: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        event: input.event,
        payload: input.payload,
      })
    )
  );
}

export async function enqueueWebhookDelivery(input: {
  endpointId: string;
  url: string;
  secret: string;
  event: DispatchableWebhookEvent;
  payload: Record<string, unknown>;
}) {
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      webhookEndpointId: input.endpointId,
      event: input.event,
      payload: input.payload,
      status: "pending",
      attempts: 0,
    })
    .returning();

  await attemptWebhookDelivery({
    delivery,
    url: input.url,
    secret: input.secret,
  });

  return delivery;
}

export async function attemptWebhookDelivery(input: {
  delivery: WebhookDelivery;
  url: string;
  secret: string;
}) {
  const body = buildWebhookBody(input.delivery.event, input.delivery.payload);
  const headers = buildWebhookHeaders({
    secret: input.secret,
    event: input.delivery.event,
    deliveryId: input.delivery.id,
    rawBody: body,
  });

  const nextAttempt = input.delivery.attempts + 1;

  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers,
      body,
    });

    const responseBody = await response.text();

    if (response.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          status: "delivered",
          attempts: nextAttempt,
          responseStatus: response.status,
          responseBody: responseBody.slice(0, 4000),
          deliveredAt: new Date(),
          nextRetryAt: null,
          lastError: null,
        })
        .where(eq(webhookDeliveries.id, input.delivery.id));

      return { success: true as const };
    }

    const errorMessage = `HTTP ${response.status}: ${responseBody.slice(0, 500)}`;
    await scheduleRetryOrFail(input.delivery.id, nextAttempt, {
      responseStatus: response.status,
      responseBody: responseBody.slice(0, 4000),
      lastError: errorMessage,
    });

    return { success: false as const, error: errorMessage };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Webhook delivery failed";

    await scheduleRetryOrFail(input.delivery.id, nextAttempt, {
      lastError: errorMessage,
      responseBody: errorMessage,
    });

    return { success: false as const, error: errorMessage };
  }
}

async function scheduleRetryOrFail(
  deliveryId: string,
  attempts: number,
  extra: {
    responseStatus?: number;
    responseBody?: string;
    lastError: string;
  }
) {
  const hasRetriesLeft = attempts < WEBHOOK_MAX_ATTEMPTS;

  await db
    .update(webhookDeliveries)
    .set({
      status: hasRetriesLeft ? "pending" : "failed",
      attempts,
      responseStatus: extra.responseStatus ?? null,
      responseBody: extra.responseBody ?? null,
      lastError: extra.lastError,
      nextRetryAt: hasRetriesLeft
        ? new Date(Date.now() + getRetryDelayMs(attempts))
        : null,
      deliveredAt: null,
    })
    .where(eq(webhookDeliveries.id, deliveryId));
}

export async function processDueWebhookRetries(limit = 25) {
  const now = new Date();

  const due = await db
    .select({
      delivery: webhookDeliveries,
      endpoint: webhookEndpoints,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.webhookEndpointId, webhookEndpoints.id)
    )
    .where(
      and(
        eq(webhookDeliveries.status, "pending"),
        isNotNull(webhookDeliveries.nextRetryAt),
        lte(webhookDeliveries.nextRetryAt, now)
      )
    )
    .limit(limit);

  for (const row of due) {
    if (row.endpoint.enabled !== 1) {
      await db
        .update(webhookDeliveries)
        .set({
          status: "failed",
          lastError: "Webhook endpoint is disabled",
          nextRetryAt: null,
        })
        .where(eq(webhookDeliveries.id, row.delivery.id));
      continue;
    }

    await attemptWebhookDelivery({
      delivery: row.delivery,
      url: row.endpoint.url,
      secret: row.endpoint.secret,
    });
  }

  return due.length;
}

export function buildTestWebhookPayload() {
  const now = new Date().toISOString();

  return {
    id: "pay_test_webhook",
    object: "payment_intent",
    amount: "0.0000001",
    pricing_currency: "USD",
    pricing_amount: "10.00",
    status: "pending",
    description: "Payoes webhook test event",
    metadata: { payoes_test: "true" },
    checkout_url: null,
    source_type: "direct",
    customer_id: null,
    payer_address: null,
    tx_hash: null,
    confirmed_at: null,
    expires_at: null,
    created_at: now,
  };
}
