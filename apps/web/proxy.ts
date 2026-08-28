import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase-middleware";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const isValidKey =
  CLERK_KEY.startsWith("pk_test_") || CLERK_KEY.startsWith("pk_live_");

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/auth-redirect",
  "/choose-role",
  "/onboarding",
  "/student-onboarding",
  "/setup",
  "/terms",
  "/privacy",
  "/cookies",
  "/robots.txt",
  "/sitemap.xml",
  "/icon.svg",
  "/opengraph-image",
  "/twitter-image",
  "/api/health",
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/__clerk") ||
    pathname.startsWith("/monitoring")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clerkHandler: ((req: NextRequest) => any) | null = null;

if (isValidKey) {
  // Clerk's conditional provider loading must remain runtime-gated.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");

  const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/auth/callback",
    "/auth-redirect",
    "/choose-role",
    "/onboarding",
    "/student-onboarding",
    "/setup(.*)",
    "/terms",
    "/privacy",
    "/cookies",
    "/robots.txt",
    "/sitemap.xml",
    "/icon.svg",
    "/opengraph-image",
    "/twitter-image",
    "/api/health",
    "/api/webhooks/(.*)",
    "/__clerk(.*)",
    "/monitoring(.*)",
  ]);

  clerkHandler = clerkMiddleware(async (auth: { protect(): Promise<void> }, request: NextRequest) => {
    if (!isPublicRoute(request)) await auth.protect();
  });
}

export default async function proxy(request: NextRequest) {
  if (process.env.AUTH_PROVIDER === "supabase") {
    // Public authentication routes must render without waiting on an existing
    // Supabase session lookup. Protected routes continue through the session
    // refresh and server-side user validation below.
    if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
    const response = await refreshSupabaseSession(request);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return new NextResponse("Service Unavailable — Supabase Auth not configured", { status: 503 });
    const { createServerClient } = await import("@supabase/ssr");
    const client = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => undefined } });
    const { data } = await client.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/sign-in", request.url));
    return response;
  }
  if (clerkHandler) return clerkHandler(request);
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  return new NextResponse("Service Unavailable — Clerk not configured", { status: 503 });
}
