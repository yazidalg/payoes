import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
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
