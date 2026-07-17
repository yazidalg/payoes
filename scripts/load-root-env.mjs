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

  return repoRoot;
}
