import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that don't need an active Clerk session.
// All other routes are protected — unauthenticated users are sent to /sign-in.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth-redirect",
  "/choose-role",
  "/onboarding",
  "/student-onboarding",
  "/setup",
  "/monitoring(.*)", // Sentry tunnel
  "/api/webhooks/(.*)", // Clerk + Stripe webhooks
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
