/**
 * Sentry verification endpoint — DELETE after confirming errors appear in dashboard.
 * Hit GET /api/sentry-test to trigger a server-side error captured by Sentry.
 */

// @ts-expect-error — intentional undefined call to test Sentry error capture
const myUndefinedFunction: () => void = undefined;

export async function GET() {
  myUndefinedFunction();
  return Response.json({ ok: true });
}
