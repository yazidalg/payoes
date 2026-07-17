import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export function loadRootEnv() {
  config({ path: path.join(repoRoot, ".env.local") });
  config({ path: path.join(repoRoot, ".env") });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    process.env.AUTH_URL = appUrl;
  }

  const nextjsPort = process.env.NEXTJS_PORT?.trim();

  if (nextjsPort) {
    process.env.PORT = nextjsPort;
  }

  syncLocalDatabaseUrlPort();

  return repoRoot;
}

function syncLocalDatabaseUrlPort() {
  const postgresPort = process.env.POSTGRES_PORT?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!postgresPort || !databaseUrl) {
    return;
  }

  try {
    const url = new URL(databaseUrl);

    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return;
    }

    if (url.port === postgresPort) {
      return;
    }

    url.port = postgresPort;
    process.env.DATABASE_URL = url.toString();
  } catch {
    // Keep the provided DATABASE_URL if it cannot be parsed.
  }
}
