import type { NextConfig } from "next";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const basePath = isGitHubPages && repository ? `/${repository}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
};

export default nextConfig;
