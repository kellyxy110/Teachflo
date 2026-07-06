import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { stageImportJob, type StagingRowInput } from "@/lib/services/import/stage";

export const maxDuration = 60;

// POST /api/student-hub/jobs/[jobId]/stage
// Body: { rows: StagingRowInput[] }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`import-stage:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const job = await db.importJob.findUnique({ where: { id: jobId } });
  if (!job || job.schoolId !== teacher.schoolId) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }
  if (!["PENDING", "ANALYZING"].includes(job.status)) {
    return Response.json({ error: `Job is already in status ${job.status}` }, { status: 409 });
  }

  const body = await request.json() as { rows: StagingRowInput[] };
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return Response.json({ error: "rows array is required" }, { status: 400 });
  }

  const result = await stageImportJob(jobId, teacher.schoolId, body.rows);
  return Response.json(result);
}
