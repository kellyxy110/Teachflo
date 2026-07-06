import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/student-hub/jobs/[jobId]/discard
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const job = await db.importJob.findUnique({ where: { id: jobId } });
  if (!job || job.schoolId !== teacher.schoolId) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  await db.importJob.update({
    where: { id: jobId },
    data: { status: "DISCARDED" },
  });

  return Response.json({ discarded: true });
}
