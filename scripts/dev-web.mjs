import { spawn } from "node:child_process";
import path from "node:path";
import { loadRootEnv } from "./load-root-env.mjs";

const repoRoot = loadRootEnv();
const port = process.env.NEXTJS_PORT?.trim() || "3000";

const child = spawn(
  "npx",
  ["next", "dev", "--turbopack", "-p", port],
  {
    cwd: path.join(repoRoot, "apps/web"),
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
