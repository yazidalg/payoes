import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, apiLogs, type Organization } from "@/lib/db/schema";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";
import type { ApiLogRow } from "@/lib/api-logs/types";

export async function logApiRequest(input: {
  organizationId: string;
  environment: Organization["environment"];
  apiKeyId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}) {
  await db.insert(apiLogs).values({
    organizationId: input.organizationId,
    environment: input.environment,
    apiKeyId: input.apiKeyId ?? null,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
  });
}

type ListApiLogsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  method?: string;
  statusGroup?: "2xx" | "4xx" | "5xx";
  apiKeyId?: string;
};

function serializeApiLog(row: {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  createdAt: Date;
  apiKeyId: string | null;
  apiKeyName: string | null;
  apiKeyPrefix: string | null;
}): ApiLogRow {
  return {
    id: row.id,
    method: row.method,
    path: row.path,
    statusCode: row.statusCode,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
    apiKeyId: row.apiKeyId,
    apiKeyName: row.apiKeyName,
    apiKeyPrefix: row.apiKeyPrefix,
  };
}

function buildStatusGroupWhere(statusGroup: ListApiLogsQuery["statusGroup"]) {
  if (statusGroup === "2xx") {
    return and(gte(apiLogs.statusCode, 200), lt(apiLogs.statusCode, 300));
  }

  if (statusGroup === "4xx") {
    return and(gte(apiLogs.statusCode, 400), lt(apiLogs.statusCode, 500));
  }

  if (statusGroup === "5xx") {
    return gte(apiLogs.statusCode, 500);
  }

  return undefined;
}

export async function listApiLogsPaginated(
  organizationId: string,
  environment: Organization["environment"],
  query: ListApiLogsQuery = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const search = query.search?.trim();

  const envWhere = organizationEnvironmentWhere(
    apiLogs.organizationId,
    apiLogs.environment,
    organizationId,
    environment,
  );

  let whereClause: SQL | undefined = envWhere;

  if (search) {
    whereClause = and(whereClause, ilike(apiLogs.path, `%${search}%`));
  }

  if (query.method) {
    whereClause = and(whereClause, eq(apiLogs.method, query.method));
  }

  const statusGroupWhere = buildStatusGroupWhere(query.statusGroup);
  if (statusGroupWhere) {
    whereClause = and(whereClause, statusGroupWhere);
  }

  if (query.apiKeyId) {
    whereClause = and(whereClause, eq(apiLogs.apiKeyId, query.apiKeyId));
  }

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: apiLogs.id,
        method: apiLogs.method,
        path: apiLogs.path,
        statusCode: apiLogs.statusCode,
        durationMs: apiLogs.durationMs,
        createdAt: apiLogs.createdAt,
        apiKeyId: apiLogs.apiKeyId,
        apiKeyName: apiKeys.name,
        apiKeyPrefix: apiKeys.keyPrefix,
      })
      .from(apiLogs)
      .leftJoin(apiKeys, eq(apiLogs.apiKeyId, apiKeys.id))
      .where(whereClause)
      .orderBy(desc(apiLogs.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(apiLogs)
      .where(whereClause),
  ]);

  return {
    logs: rows.map(serializeApiLog),
    total: totalRows[0]?.count ?? 0,
  };
}

export async function listApiLogs(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50,
) {
  const result = await listApiLogsPaginated(organizationId, environment, {
    page: 1,
    pageSize: limit,
  });

  return result.logs;
}
