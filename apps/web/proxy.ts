import { NextResponse, type NextRequest } from "next/server";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Only initialise Clerk middleware when the publishable key is present AND valid.
// An invalid/malformed key causes Clerk to throw at init time and crash the app.
const isValidKey =
  typeof CLERK_KEY === "string" &&
  (CLERK_KEY.startsWith("pk_test_") || CLERK_KEY.startsWith("pk_live_"));

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
      "/__clerk(.*)",
    ]);

    _clerkHandler = clerkMiddleware(
      async (auth: { protect(): Promise<void> }, request: NextRequest) => {
        if (!isPublicRoute(request)) await auth.protect();
      }
    );
  } catch {
    // Clerk init failed — fail open so the landing page stays up
    _clerkHandler = null;
  }
}

export const proxy = _clerkHandler
  ? _clerkHandler
  : (_request: NextRequest) => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk(.*)",
  ],
};
