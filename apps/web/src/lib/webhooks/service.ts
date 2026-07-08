import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  webhookDeliveries,
  webhookEndpoints,
  type Organization,
} from "@/lib/db/schema";
import { WEBHOOK_MAX_ATTEMPTS } from "@/constants/webhooks/retry";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import {
  attemptWebhookDelivery,
  buildTestWebhookPayload,
  enqueueWebhookDelivery,
} from "@/lib/webhooks/delivery";

export function maskWebhookSecret(secret: string) {
  if (secret.length <= 8) {
    return "••••••••";
  }

  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}

export async function listWebhookEndpoints(
  organizationId: string,
  environment: Organization["environment"]
) {
  return db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      enabled: webhookEndpoints.enabled,
      createdAt: webhookEndpoints.createdAt,
      secretPreview: webhookEndpoints.secret,
    })
    .from(webhookEndpoints)
    .where(
      organizationEnvironmentWhere(
        webhookEndpoints.organizationId,
        webhookEndpoints.environment,
        organizationId,
        environment
      )
    )
    .orderBy(desc(webhookEndpoints.createdAt))
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        url: row.url,
        events: row.events,
        enabled: row.enabled,
        createdAt: row.createdAt,
        secretPreview: maskWebhookSecret(row.secretPreview),
      }))
    );
}

export async function getWebhookEndpoint(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"]
) {
  const [endpoint] = await db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      enabled: webhookEndpoints.enabled,
      createdAt: webhookEndpoints.createdAt,
      secretPreview: webhookEndpoints.secret,
    })
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookEndpoints.environment, environment)
      )
    )
    .limit(1);

  if (!endpoint) {
    return null;
  }

  return {
    ...endpoint,
    secretPreview: maskWebhookSecret(endpoint.secretPreview),
  };
}

async function getWebhookEndpointWithSecret(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"]
) {
  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookEndpoints.environment, environment)
      )
    )
    .limit(1);

  return endpoint ?? null;
}

export async function createWebhookEndpoint(input: {
  organizationId: string;
  environment: Organization["environment"];
  url: string;
  events: string[];
}) {
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;

  const [endpoint] = await db
    .insert(webhookEndpoints)
    .values({
      organizationId: input.organizationId,
      environment: input.environment,
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

export async function updateWebhookEndpoint(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"],
  input: {
    url?: string;
    events?: string[];
    enabled?: boolean;
  }
) {
  const existing = await getWebhookEndpointWithSecret(
    organizationId,
    webhookId,
    environment
  );

  if (!existing) {
    return null;
  }

  const [endpoint] = await db
    .update(webhookEndpoints)
    .set({
      url: input.url?.trim() ?? existing.url,
      events: input.events ?? existing.events,
      enabled:
        input.enabled === undefined
          ? existing.enabled
          : input.enabled
            ? 1
            : 0,
      updatedAt: new Date(),
    })
    .where(eq(webhookEndpoints.id, existing.id))
    .returning({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      enabled: webhookEndpoints.enabled,
      createdAt: webhookEndpoints.createdAt,
      secret: webhookEndpoints.secret,
    });

  return {
    ...endpoint,
    secretPreview: maskWebhookSecret(endpoint.secret),
  };
}

export async function rotateWebhookSecret(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"]
) {
  const existing = await getWebhookEndpointWithSecret(
    organizationId,
    webhookId,
    environment
  );

  if (!existing) {
    return null;
  }

  const secret = `whsec_${randomBytes(24).toString("base64url")}`;

  await db
    .update(webhookEndpoints)
    .set({ secret, updatedAt: new Date() })
    .where(eq(webhookEndpoints.id, existing.id));

  return secret;
}

export async function deleteWebhookEndpoint(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"]
) {
  const [endpoint] = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookEndpoints.environment, environment)
      )
    )
    .returning({ id: webhookEndpoints.id });

  return endpoint ?? null;
}

function serializeDeliveryRow(
  row: {
    id: string;
    event: string;
    status: string;
    responseStatus: number | null;
    responseBody: string | null;
    payload: Record<string, unknown>;
    attempts: number;
    nextRetryAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    deliveredAt: Date | null;
  }
) {
  return {
    id: row.id,
    event: row.event,
    status: row.status,
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: WEBHOOK_MAX_ATTEMPTS,
    nextRetryAt: row.nextRetryAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
    deliveredAt: row.deliveredAt,
  };
}

export async function listWebhookDeliveries(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  const rows = await db
    .select({
      id: webhookDeliveries.id,
      event: webhookDeliveries.event,
      status: webhookDeliveries.status,
      responseStatus: webhookDeliveries.responseStatus,
      responseBody: webhookDeliveries.responseBody,
      payload: webhookDeliveries.payload,
      attempts: webhookDeliveries.attempts,
      nextRetryAt: webhookDeliveries.nextRetryAt,
      lastError: webhookDeliveries.lastError,
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
    .where(
      and(
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookEndpoints.environment, environment)
      )
    )
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...serializeDeliveryRow(row),
    url: row.url,
    webhookEndpointId: row.webhookEndpointId,
  }));
}

export async function listWebhookDeliveriesForEndpoint(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"],
  limit = 50
) {
  const rows = await db
    .select({
      id: webhookDeliveries.id,
      event: webhookDeliveries.event,
      status: webhookDeliveries.status,
      responseStatus: webhookDeliveries.responseStatus,
      responseBody: webhookDeliveries.responseBody,
      payload: webhookDeliveries.payload,
      attempts: webhookDeliveries.attempts,
      nextRetryAt: webhookDeliveries.nextRetryAt,
      lastError: webhookDeliveries.lastError,
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
        eq(webhookEndpoints.environment, environment),
        eq(webhookDeliveries.webhookEndpointId, webhookId)
      )
    )
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);

  return rows.map(serializeDeliveryRow);
}

export async function sendTestWebhook(
  organizationId: string,
  webhookId: string,
  environment: Organization["environment"]
) {
  const endpoint = await getWebhookEndpointWithSecret(
    organizationId,
    webhookId,
    environment
  );

  if (!endpoint) {
    throw new Error("Webhook not found");
  }

  const delivery = await enqueueWebhookDelivery({
    endpointId: endpoint.id,
    url: endpoint.url,
    secret: endpoint.secret,
    event: "webhook.test",
    payload: buildTestWebhookPayload(),
  });

  const [latest] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, delivery.id))
    .limit(1);

  return latest ? serializeDeliveryRow(latest) : null;
}

export async function retryWebhookDelivery(
  organizationId: string,
  webhookId: string,
  deliveryId: string,
  environment: Organization["environment"]
) {
  const endpoint = await getWebhookEndpointWithSecret(
    organizationId,
    webhookId,
    environment
  );

  if (!endpoint) {
    throw new Error("Webhook not found");
  }

  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.id, deliveryId),
        eq(webhookDeliveries.webhookEndpointId, endpoint.id)
      )
    )
    .limit(1);

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  if (delivery.status === "delivered") {
    throw new Error("Delivery already succeeded");
  }

  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      nextRetryAt: null,
      lastError: null,
    })
    .where(eq(webhookDeliveries.id, delivery.id));

  const [freshDelivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, delivery.id))
    .limit(1);

  if (!freshDelivery) {
    throw new Error("Delivery not found");
  }

  const result = await attemptWebhookDelivery({
    delivery: freshDelivery,
    url: endpoint.url,
    secret: endpoint.secret,
  });

  const [latest] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, delivery.id))
    .limit(1);

  return {
    delivery: latest ? serializeDeliveryRow(latest) : null,
    result,
  };
}

export { WEBHOOK_MAX_ATTEMPTS };
