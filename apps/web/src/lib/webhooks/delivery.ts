import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { signWebhookPayload } from "@/lib/webhooks/service";

type WebhookEvent =
  | "payment.created"
  | "payment.completed"
  | "payment.failed"
  | "payment.expired";

export async function dispatchWebhookEvent(input: {
  organizationId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}) {
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, input.organizationId));

  const matching = endpoints.filter(
    (endpoint) => endpoint.enabled === 1 && endpoint.events.includes(input.event)
  );

  await Promise.all(
    matching.map((endpoint) =>
      deliverWebhook({
        endpointId: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        event: input.event,
        payload: input.payload,
      })
    )
  );
}

async function deliverWebhook(input: {
  endpointId: string;
  url: string;
  secret: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}) {
  const body = JSON.stringify({
    event: input.event,
    data: input.payload,
  });
  const signature = signWebhookPayload(input.secret, body);

  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      webhookEndpointId: input.endpointId,
      event: input.event,
      payload: input.payload,
      status: "pending",
      attempts: 1,
    })
    .returning();

  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payoes-Signature": signature,
      },
      body,
    });

    const responseBody = await response.text();

    await db
      .update(webhookDeliveries)
      .set({
        status: response.ok ? "delivered" : "failed",
        responseStatus: response.status,
        responseBody: responseBody.slice(0, 2000),
        deliveredAt: response.ok ? new Date() : null,
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  } catch (error) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        responseBody:
          error instanceof Error ? error.message : "Webhook delivery failed",
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  }
}
