import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  poweredByHeader: false,
  // Lets a second local server (e.g. a preview on another port) build into its own folder.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
