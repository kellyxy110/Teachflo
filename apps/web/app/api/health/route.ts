import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check env vars
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  checks.clerk_key = {
    ok: pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_"),
    detail: pubKey ? `starts_with:${pubKey.slice(0, 8)}` : "missing",
  };

  const secKey = process.env.CLERK_SECRET_KEY ?? "";
  checks.clerk_secret = {
    ok: secKey.startsWith("sk_test_") || secKey.startsWith("sk_live_"),
    detail: secKey ? `starts_with:${secKey.slice(0, 8)}` : "missing",
  };

  const rawUrl = process.env.DATABASE_URL ?? "";
  let parsedUser = "unknown";
  try {
    parsedUser = new URL(rawUrl).username;
  } catch {}
  checks.database_url = {
    ok: !!rawUrl,
    detail: rawUrl
      ? `user=${parsedUser} host=${new URL(rawUrl).hostname}:${new URL(rawUrl).port}`
      : "missing",
  };

  // Check DB connectivity
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, detail: "connected" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.database = {
      ok: false,
      detail: msg.slice(0, 200),
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks },
    { status: allOk ? 200 : 503 },
  );
}
