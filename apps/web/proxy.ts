import { NextResponse, type NextRequest } from "next/server";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Only initialise Clerk middleware when the publishable key is present.
// Without this guard, clerkMiddleware() throws at module load time on
// preview deployments that have no env vars configured.
export const proxy = CLERK_KEY
  ? (() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");
      const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
      return clerkMiddleware(async (auth: { protect: () => Promise<void> }, request: NextRequest) => {
        if (!isPublicRoute(request)) await auth.protect();
      });
    })()
  : (_request: NextRequest) => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
