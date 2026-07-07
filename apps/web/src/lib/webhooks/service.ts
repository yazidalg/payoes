import { createHmac, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";

export async function listWebhookEndpoints(organizationId: string) {
  return db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      enabled: webhookEndpoints.enabled,
      createdAt: webhookEndpoints.createdAt,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, organizationId))
    .orderBy(desc(webhookEndpoints.createdAt));
}

export async function getWebhookEndpoint(
  organizationId: string,
  webhookId: string
) {
  const [endpoint] = await db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      enabled: webhookEndpoints.enabled,
      createdAt: webhookEndpoints.createdAt,
    })
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .limit(1);

  return endpoint ?? null;
}

export async function createWebhookEndpoint(input: {
  organizationId: string;
  url: string;
  events: string[];
}) {
  const secret = randomBytes(24).toString("base64url");

  const [endpoint] = await db
    .insert(webhookEndpoints)
    .values({
      organizationId: input.organizationId,
      url: input.url.trim(),
      events: input.events,
      secret,
    })
    .returning({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      enabled: webhookEndpoints.enabled,
      createdAt: webhookEndpoints.createdAt,
      secret: webhookEndpoints.secret,
    });

  return endpoint;
}

export async function deleteWebhookEndpoint(
  organizationId: string,
  webhookId: string
) {
  const [endpoint] = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .returning({ id: webhookEndpoints.id });

  return endpoint ?? null;
}

export async function listWebhookDeliveries(organizationId: string, limit = 50) {
  return db
    .select({
      id: webhookDeliveries.id,
      event: webhookDeliveries.event,
      status: webhookDeliveries.status,
      responseStatus: webhookDeliveries.responseStatus,
      attempts: webhookDeliveries.attempts,
      createdAt: webhookDeliveries.createdAt,
      deliveredAt: webhookDeliveries.deliveredAt,
      url: webhookEndpoints.url,
      webhookEndpointId: webhookDeliveries.webhookEndpointId,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.webhookEndpointId, webhookEndpoints.id)
    )
    .where(eq(webhookEndpoints.organizationId, organizationId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}

export async function listWebhookDeliveriesForEndpoint(
  organizationId: string,
  webhookId: string,
  limit = 50
) {
  return db
    .select({
      id: webhookDeliveries.id,
      event: webhookDeliveries.event,
      status: webhookDeliveries.status,
      responseStatus: webhookDeliveries.responseStatus,
      attempts: webhookDeliveries.attempts,
      createdAt: webhookDeliveries.createdAt,
      deliveredAt: webhookDeliveries.deliveredAt,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.webhookEndpointId, webhookEndpoints.id)
    )
    .where(
      and(
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookDeliveries.webhookEndpointId, webhookId)
      )
    )
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}

export function signWebhookPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
