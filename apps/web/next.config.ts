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
  org: "teachflow",
  project: "teachflow-os",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: true,
});
