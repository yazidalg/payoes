import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient?: Sql;
  db?: PostgresJsDatabase<typeof schema>;
};

function getQueryClient() {
  if (globalForDb.queryClient) {
    return globalForDb.queryClient;
  }

  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, { max: 10, connect_timeout: 10 });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.queryClient = client;
  }

  return client;
}

export function getDb() {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const database = drizzle(getQueryClient(), { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.db = database;
  }

  return database;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});

export type Database = PostgresJsDatabase<typeof schema>;
