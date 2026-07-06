import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/services/connectors/registry";
import type { SyncPayload } from "@/lib/services/connectors/base";

export const maxDuration = 120;

// POST /api/student-hub/portal/sync
// Pulls data from connected portal, runs staging, returns staged job ID.
export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`portal-sync:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const body = await request.json() as {
    portalType: string;
    classId?: string;
    termId?: string;
  };

  if (!body.portalType) {
    return Response.json({ error: "portalType is required" }, { status: 400 });
  }

  const connection = await db.portalConnection.findUnique({
    where: { schoolId_portalType: { schoolId: teacher.schoolId, portalType: body.portalType } },
  });

  if (!connection || !connection.isActive) {
    return Response.json(
      { error: "No active connection for this portal. Please connect first." },
      { status: 404 }
    );
  }

  if (connection.tokenExpiry && connection.tokenExpiry < new Date()) {
    return Response.json(
      { error: "Portal session expired. Please reconnect." },
      { status: 401 }
    );
  }

  const connector = getConnector(body.portalType);
  if (connection.sessionToken) connector.restoreSession(connection.sessionToken);

  let payload: SyncPayload;
  try {
    payload = await connector.sync({ classId: body.classId, termId: body.termId });
  } catch (e) {
    await db.syncLog.create({
      data: {
        schoolId: teacher.schoolId,
        teacherId: teacher.id,
        type: "INCREMENTAL",
        source: body.portalType,
        status: "FAILED",
        summary: { error: e instanceof Error ? e.message : "Sync failed" },
        completedAt: new Date(),
      },
    });
    return Response.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 502 }
    );
  }

  // Build a change summary to show to the teacher before committing
  const changesSummary = {
    newStudents: payload.students.length,
    classes: payload.classes.length,
    subjects: payload.subjects.length,
    results: payload.results.length,
    remarks: payload.remarks.length,
    session: payload.session.name,
    term: payload.term.name,
    syncedAt: payload.syncedAt,
  };

  // Create a staging job record (rows committed separately via job/commit)
  const job = await db.importJob.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      source: "PORTAL",
      metadata: JSON.parse(JSON.stringify({ portalType: body.portalType, changesSummary, payload })),
    },
  });

  await db.portalConnection.update({
    where: { id: connection.id },
    data: { lastSynced: new Date() },
  });

  return Response.json({ jobId: job.id, changesSummary });
}
