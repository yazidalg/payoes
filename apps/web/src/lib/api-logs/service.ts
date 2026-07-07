import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiLogs } from "@/lib/db/schema";

export async function logApiRequest(input: {
  organizationId: string;
  apiKeyId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}) {
  await db.insert(apiLogs).values({
    organizationId: input.organizationId,
    apiKeyId: input.apiKeyId ?? null,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
  });
}

export async function listApiLogs(organizationId: string, limit = 50) {
  return db
    .select()
    .from(apiLogs)
    .where(eq(apiLogs.organizationId, organizationId))
    .orderBy(desc(apiLogs.createdAt))
    .limit(limit);
}
