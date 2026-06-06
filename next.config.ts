import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/IconCrafts",
  assetPrefix: "/IconCrafts/",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
