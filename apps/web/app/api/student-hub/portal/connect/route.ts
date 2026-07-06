import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { getConnector, isValidPortalType } from "@/lib/services/connectors/registry";

export const maxDuration = 30;

// POST /api/student-hub/portal/connect
// Authenticates with a portal, stores session token (never stores password).
export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`portal-connect:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({
    where: { clerkId: auth.userId },
    include: { school: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const body = await request.json() as {
    portalType: string;
    username: string;
    password: string;
    portalUrl?: string;
    schoolCode?: string;
  };

  const { portalType, username, password } = body;
  if (!portalType || !username || !password) {
    return Response.json({ error: "portalType, username, and password are required" }, { status: 400 });
  }

  if (!isValidPortalType(portalType)) {
    return Response.json({ error: `Unknown portal type: ${portalType}` }, { status: 400 });
  }

  const connector = getConnector(portalType);
  connector.configure({ portalUrl: body.portalUrl, schoolCode: body.schoolCode });

  let token: string;
  let expiry: Date;
  let schoolInfo: { name?: string } = {};

  try {
    ({ token, expiry } = await connector.login(username, password));
    schoolInfo = await connector.fetchSchool().catch(() => ({}));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  await db.portalConnection.upsert({
    where: { schoolId_portalType: { schoolId: teacher.schoolId, portalType } },
    create: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      portalType,
      displayName: `${portalType} — ${teacher.school.name}`,
      schoolName: (schoolInfo as { name?: string }).name,
      sessionToken: token,
      tokenExpiry: expiry,
      isActive: true,
    },
    update: {
      sessionToken: token,
      tokenExpiry: expiry,
      isActive: true,
      schoolName: (schoolInfo as { name?: string }).name,
    },
  });

  return Response.json({
    connected: true,
    portalType,
    schoolName: (schoolInfo as { name?: string }).name,
    tokenExpiry: expiry,
  });
}

// GET /api/student-hub/portal/connect — list active portal connections
export async function GET() {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const connections = await db.portalConnection.findMany({
    where: { schoolId: teacher.schoolId, isActive: true },
    select: {
      id: true,
      portalType: true,
      displayName: true,
      schoolName: true,
      tokenExpiry: true,
      lastSynced: true,
      isActive: true,
      createdAt: true,
    },
  });

  return Response.json({ connections });
}
