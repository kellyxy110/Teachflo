import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check env vars
  checks.clerk_key = {
    ok: !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").startsWith("pk_"),
    detail: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      ? "present"
      : "missing",
  };

  checks.database_url = {
    ok: !!process.env.DATABASE_URL,
    detail: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:[^@]+@/, ":***@")
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
