import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const maxDuration = 30;

// GET  /api/student-hub/jobs — list recent import jobs for current teacher's school
// POST /api/student-hub/jobs — create a new import job (returns jobId for staging)
export async function GET(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const jobs = await db.importJob.findMany({
    where: { schoolId: teacher.schoolId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      source: true,
      fileName: true,
      status: true,
      totalRows: true,
      newStudents: true,
      updatedStudents: true,
      newScores: true,
      conflicts: true,
      errors: true,
      committedAt: true,
      createdAt: true,
    },
  });

  return Response.json({ jobs });
}

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`import-job:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const body = await request.json() as { source: string; fileName?: string; metadata?: Record<string, unknown> };
  const validSources = ["EXCEL", "CSV", "PORTAL", "MANUAL", "OCR"] as const;
  if (!validSources.includes(body.source as typeof validSources[number])) {
    return Response.json({ error: "Invalid source" }, { status: 400 });
  }

  const job = await db.importJob.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      source: body.source as typeof validSources[number],
      fileName: body.fileName,
      metadata: body.metadata,
    },
  });

  return Response.json({ jobId: job.id, status: job.status });
}
