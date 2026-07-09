import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["payoes.com"],
  transpilePackages: ["@dub/ui", "@dub/utils"],
};

export default nextConfig;
