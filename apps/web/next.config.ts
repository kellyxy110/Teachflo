import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@teachflow/shared", "@teachflow/database", "@teachflow/ai-prompts"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  async redirects() {
    return [
      { source: "/signin", destination: "/sign-in", permanent: true },
      { source: "/signup", destination: "/sign-up", permanent: true },
      { source: "/login", destination: "/sign-in", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "kellyxyhub",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Tunnel Sentry events through our domain to bypass ad-blockers.
  // /monitoring must be public in proxy.ts.
  tunnelRoute: "/monitoring",
  // Note: webpack.treeshake is NOT used here — conflicts with Turbopack.
  automaticVercelMonitors: true,
});
