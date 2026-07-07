import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiLogs, type Organization } from "@/lib/db/schema";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";

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

export async function listApiLogs(
  organizationId: string,
  environment: Organization["environment"],
  limit = 50
) {
  return db
    .select()
    .from(apiLogs)
    .where(
      organizationEnvironmentWhere(
        apiLogs.organizationId,
        apiLogs.environment,
        organizationId,
        environment
      )
    )
    .orderBy(desc(apiLogs.createdAt))
    .limit(limit);
}
