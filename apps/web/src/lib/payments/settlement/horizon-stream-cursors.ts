import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { horizonStreamCursors, type Organization } from "@/lib/db/schema";

export async function getHorizonStreamCursor(
  environment: Organization["environment"],
) {
  const [row] = await db
    .select()
    .from(horizonStreamCursors)
    .where(eq(horizonStreamCursors.environment, environment))
    .limit(1);

  return row?.pagingToken ?? null;
}

export async function saveHorizonStreamCursor(
  environment: Organization["environment"],
  pagingToken: string,
) {
  const now = new Date();

  await db
    .insert(horizonStreamCursors)
    .values({
      environment,
      pagingToken,
      lastEventAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: horizonStreamCursors.environment,
      set: {
        pagingToken,
        lastEventAt: now,
        updatedAt: now,
      },
    });
}
