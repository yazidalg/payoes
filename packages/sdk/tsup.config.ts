import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const packageDir = dirname(fileURLToPath(import.meta.url));
const publicSdkDir = join(packageDir, "../../apps/web/public/sdk");

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm"],
    dts: true,
    minify: true,
    clean: true,
    splitting: false,
    outExtension() {
      return {
        js: ".mjs",
      };
    },
  },
  {
    entry: {
      checkout: "src/script.ts",
    },
    format: ["iife"],
    platform: "browser",
    minify: true,
    splitting: false,
    outExtension() {
      return {
        js: ".js",
      };
    },
    onSuccess: async () => {
      mkdirSync(publicSdkDir, { recursive: true });
      copyFileSync(
        join(packageDir, "dist/checkout.js"),
        join(publicSdkDir, "checkout.js"),
      );
    },
  },
]);
