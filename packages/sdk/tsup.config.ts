import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const packageDir = dirname(fileURLToPath(import.meta.url));
const publicSdkDir = join(packageDir, "../../apps/web/public/sdk");

export default defineConfig({
  entry: {
    index: "src/index.ts",
    checkout: "src/script.ts",
  },
  format: ["esm", "iife"],
  dts: true,
  minify: true,
  clean: true,
  splitting: false,
  globalName: "Payoes",
  outExtension({ format }) {
    return {
      js: format === "iife" ? ".js" : ".mjs",
    };
  },
  onSuccess: async () => {
    mkdirSync(publicSdkDir, { recursive: true });
    copyFileSync(
      join(packageDir, "dist/checkout.js"),
      join(publicSdkDir, "checkout.js"),
    );
  },
});
