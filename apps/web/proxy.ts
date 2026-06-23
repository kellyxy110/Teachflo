import { NextResponse, type NextRequest } from "next/server";

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
  "/setup",
  "/terms",
  "/privacy",
  "/cookies",
  "/robots.txt",
  "/sitemap.xml",
  "/icon.svg",
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
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");

  const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/setup(.*)",
    "/terms",
    "/privacy",
    "/cookies",
    "/robots.txt",
    "/sitemap.xml",
    "/icon.svg",
    "/api/webhooks/(.*)",
    "/__clerk(.*)",
    "/monitoring(.*)",
  ]);

  clerkHandler = clerkMiddleware(async (auth: { protect(): Promise<void> }, request: NextRequest) => {
    if (!isPublicRoute(request)) await auth.protect();
  });
}

export default function proxy(request: NextRequest) {
  if (clerkHandler) return clerkHandler(request);
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  return new NextResponse("Service Unavailable — Clerk not configured", { status: 503 });
}
