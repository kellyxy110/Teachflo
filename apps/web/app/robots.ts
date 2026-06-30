import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const disallowedPaths = [
    "/api/",
    "/dashboard",
    "/classes",
    "/students",
    "/lessons",
    "/exams",
    "/homework",
    "/scores",
    "/analytics",
    "/study-buddy",
    "/intelligence",
    "/library",
    "/settings",
    "/onboarding",
    "/setup",
    "/sign-in",
    "/sign-up",
  ];

  return {
    rules: [
      // Allow public marketing pages for all crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowedPaths,
      },
      // Explicitly allow AI crawlers to read public content and llms.txt
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Googlebot-Extended"],
        allow: ["/", "/llms.txt", "/terms", "/privacy"],
        disallow: disallowedPaths,
      },
    ],
    sitemap: "https://teachnexis.vercel.app/sitemap.xml",
  };
}
