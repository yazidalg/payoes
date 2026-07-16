import { execSync } from "node:child_process";
import postgres from "postgres";
import { loadRootEnv } from "../../scripts/load-root-env.mjs";

loadRootEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env.local at the repository root."
  );
  process.exit(1);
}

function run(command, options = {}) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", ...options });
}

async function waitForPostgres(maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const sql = postgres(databaseUrl, {
      connect_timeout: 2,
      idle_timeout: 1,
      max: 1,
    });

    try {
      await sql`SELECT 1`;
      await sql.end({ timeout: 1 });
      return true;
    } catch {
      await sql.end({ timeout: 1 }).catch(() => undefined);
      console.log(`Waiting for PostgreSQL (${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return false;
}

async function hasCoreTables() {
  const sql = postgres(databaseUrl, { connect_timeout: 5, max: 1 });

  try {
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'organizations', 'organization_members')
    `;
    return tables.length === 3;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

const repoRoot = new URL("../../..", import.meta.url).pathname;

console.log("Payoes database setup");
console.log(`Database: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

let postgresReady = await waitForPostgres(3);

if (!postgresReady) {
  console.log("\nPostgreSQL is not reachable. Starting Docker services...");
  try {
    run("docker compose up -d postgres", { cwd: repoRoot });
  } catch (error) {
    console.error(
      "\nCould not start PostgreSQL with Docker.\n" +
        "- Open Docker Desktop and wait until it is running\n" +
        "- Then run: npm run docker:up\n" +
        "- Then run: npm run db:setup"
    );
    process.exit(1);
  }

  postgresReady = await waitForPostgres();
}

if (!postgresReady) {
  console.error(
    "\nPostgreSQL is still unavailable on DATABASE_URL.\n" +
      "If you recently cleaned storage, the Docker volume was likely removed.\n" +
      "Start Docker Desktop, run `npm run docker:up`, then run `npm run db:setup` again."
  );
  process.exit(1);
}

if (!(await hasCoreTables())) {
  console.log("\nCore tables are missing. Applying migrations...");
  run("npx drizzle-kit migrate", { cwd: new URL("..", import.meta.url).pathname });
} else {
  console.log("\nCore tables already exist. Running pending migrations...");
  run("npx drizzle-kit migrate", { cwd: new URL("..", import.meta.url).pathname });
}

if (await hasCoreTables()) {
  console.log("\nDatabase is ready.");
  console.log(
    "If this is a fresh database, sign in again and complete onboarding."
  );
} else {
  console.error("\nMigrations finished but core tables are still missing.");
  process.exit(1);
}
