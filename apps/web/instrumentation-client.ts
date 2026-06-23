import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Lower sample rate in production to control volume.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay: record 10 % of sessions, 100 % of sessions with errors.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  // Temporarily enable debug in dev to confirm events are being sent.
  debug: process.env.NODE_ENV === "development",
});

// Capture client-side navigation transitions as spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
