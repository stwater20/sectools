import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Required for a 404 page when each language has its own root layout.
    globalNotFound: true,
  },
};

export default nextConfig;
