import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
        ],
      },
    ],
    sitemap: "https://teachflow-os.vercel.app/sitemap.xml",
  };
}
