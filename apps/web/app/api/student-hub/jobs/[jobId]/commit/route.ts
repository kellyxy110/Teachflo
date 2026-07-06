import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { commitImportJob } from "@/lib/services/import/commit";

export const maxDuration = 120;

// POST /api/student-hub/jobs/[jobId]/commit
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`import-commit:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const job = await db.importJob.findUnique({ where: { id: jobId } });
  if (!job || job.schoolId !== teacher.schoolId) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await request.json() as {
    classId: string;
    subject?: string;
    term: "FIRST" | "SECOND" | "THIRD";
    session: string;
    defaultResolution?: "KEEP_EXISTING" | "REPLACE" | "MERGE";
  };

  if (!body.classId || !body.term || !body.session) {
    return Response.json({ error: "classId, term, and session are required" }, { status: 400 });
  }

  const cls = await db.class.findFirst({
    where: { id: body.classId, schoolId: teacher.schoolId },
  });
  if (!cls) return Response.json({ error: "Class not found" }, { status: 404 });

  const result = await commitImportJob({
    jobId,
    schoolId: teacher.schoolId,
    teacherId: teacher.id,
    classId: body.classId,
    subject: body.subject,
    term: body.term,
    session: body.session,
    defaultResolution: body.defaultResolution ?? "MERGE",
  });

  return Response.json(result);
}
