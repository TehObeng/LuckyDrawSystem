import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
