import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "./payoes.db";

const sqlite = new Database(databaseUrl);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
