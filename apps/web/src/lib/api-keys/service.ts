import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, type ApiKey, type Organization } from "@/lib/db/schema";

function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

function buildRawApiKey(environment: Organization["environment"]) {
  const prefix = environment === "production" ? "pk_live_" : "pk_test_";
  const secret = randomBytes(24).toString("base64url");
  return `${prefix}${secret}`;
}

export async function listApiKeys(organizationId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      environment: apiKeys.environment,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getApiKey(organizationId: string, apiKeyId: string) {
  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      environment: apiKeys.environment,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(
      and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId))
    )
    .limit(1);

  return apiKey ?? null;
}

export async function createApiKey(input: {
  organizationId: string;
  name: string;
  environment: Organization["environment"];
}) {
  const rawKey = buildRawApiKey(input.environment);
  const keyPrefix = `${rawKey.slice(0, 12)}...`;

  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      organizationId: input.organizationId,
      name: input.name.trim(),
      keyPrefix,
      keyHash: hashApiKey(rawKey),
      environment: input.environment,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      environment: apiKeys.environment,
      createdAt: apiKeys.createdAt,
    });

  return { apiKey, rawKey };
}

export async function revokeApiKey(organizationId: string, apiKeyId: string) {
  const [apiKey] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, apiKeyId),
        eq(apiKeys.organizationId, organizationId),
        isNull(apiKeys.revokedAt)
      )
    )
    .returning({
      id: apiKeys.id,
      revokedAt: apiKeys.revokedAt,
    });

  return apiKey ?? null;
}

export async function authenticateApiKey(rawKey: string) {
  if (!rawKey.startsWith("pk_test_") && !rawKey.startsWith("pk_live_")) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!apiKey) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return apiKey as ApiKey;
}
