import { NextResponse, type NextRequest } from "next/server";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isValidKey =
  typeof CLERK_KEY === "string" &&
  (CLERK_KEY.startsWith("pk_test_") || CLERK_KEY.startsWith("pk_live_"));

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
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    || pathname.startsWith("/api/webhooks/")
    || pathname.startsWith("/__clerk")
    || pathname.startsWith("/monitoring");  // Sentry tunnel route
}

let _clerkHandler:
  | ((req: NextRequest) => Response | Promise<Response>)
  | null = null;

if (isValidKey) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      "/api/webhooks/clerk",
      "/__clerk(.*)",
      "/monitoring(.*)",  // Sentry tunnel route
    ]);

    _clerkHandler = clerkMiddleware(
      async (auth: { protect(): Promise<void> }, request: NextRequest) => {
        if (!isPublicRoute(request)) await auth.protect();
      }
    );
  } catch {
    _clerkHandler = null;
  }
}

export const proxy = _clerkHandler
  ? _clerkHandler
  : (request: NextRequest) => {
      if (isPublicPath(request.nextUrl.pathname)) {
        return NextResponse.next();
      }
      return new NextResponse("Service Unavailable", { status: 503 });
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk(.*)",
  ],
};
