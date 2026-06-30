import { db } from "@/lib/db";
import { safeAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Require authentication — this endpoint reveals internal config state
  try {
    const { userId } = await safeAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check env vars — never expose key values or DB credentials
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  checks.clerk_key = {
    ok: pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_"),
  };

  const secKey = process.env.CLERK_SECRET_KEY ?? "";
  checks.clerk_secret = {
    ok: secKey.startsWith("sk_test_") || secKey.startsWith("sk_live_"),
  };

  checks.database_url = {
    ok: !!(process.env.DATABASE_URL),
  };

  // Check DB connectivity
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, detail: "connected" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.database = {
      ok: false,
      detail: msg.slice(0, 100),
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks },
    { status: allOk ? 200 : 503 },
  );
}
