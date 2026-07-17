import { config as loadEnv } from "dotenv";
import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");

loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

const nextjsPort = process.env.NEXTJS_PORT?.trim();

if (nextjsPort) {
  process.env.PORT = nextjsPort;
}

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  transpilePackages: ["@dub/ui", "@dub/utils", "@payoes/email"],
  async headers() {
    return [
      {
        source: "/sdk/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/c/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.dub.co",
      },
    ],
  },
};

export default nextConfig;
