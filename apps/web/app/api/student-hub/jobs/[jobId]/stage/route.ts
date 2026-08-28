import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { stageImportJob, type StagingRowInput, type StageJobOptions } from "@/lib/services/import/stage";
import {
  hasChangedSubjectMapping,
  stageRequestSchema,
  validateComponentScoreValue,
  validateScoreValue,
} from "@/lib/services/import/validation";

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
  if (job.status !== "PENDING") {
    return Response.json({ error: `Job is already in status ${job.status}` }, { status: 409 });
  }

  let body: { rows: StagingRowInput[] } & StageJobOptions & {
    fullNameFormatConfirmed?: boolean;
    subjectMappingsConfirmed?: boolean;
    assessmentComponentsConfirmed?: boolean;
  };
  try {
    body = stageRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid staging request" }, { status: 400 });
  }
  if (body.rows.some((row) => ![row.parsedData.ca1, row.parsedData.ca2, row.parsedData.exam, row.parsedData.total].every(validateScoreValue))) {
    return Response.json({ error: "Scores must be numeric values between 0 and 100" }, { status: 400 });
  }
  if (body.rows.some((row) => row.parsedData.fullName?.trim()) && !body.fullNameFormatConfirmed) {
    return Response.json({ error: "Confirm the Full Name interpretation before staging" }, { status: 400 });
  }
  if (hasChangedSubjectMapping(body.subjectCanonicalMap) && !body.subjectMappingsConfirmed) {
    return Response.json({ error: "Confirm subject mappings before staging" }, { status: 400 });
  }
  if ((body.assessmentComponentMappings?.length ?? 0) > 0 && !body.assessmentComponentsConfirmed) {
    return Response.json({ error: "Confirm assessment component mappings before staging" }, { status: 400 });
  }

  const componentMappings = body.assessmentComponentMappings ?? [];
  const existingComponentIds = componentMappings.flatMap((mapping) =>
    mapping.existingComponentId ? [mapping.existingComponentId] : []
  );
  const ownedComponents = existingComponentIds.length > 0
    ? await db.assessmentComponent.findMany({
      where: { id: { in: existingComponentIds }, schoolId: teacher.schoolId, isActive: true },
      select: { id: true, maxScore: true },
    })
    : [];
  if (existingComponentIds.length > 0) {
    if (ownedComponents.length !== new Set(existingComponentIds).size) {
      return Response.json({ error: "An assessment component is unavailable for this school" }, { status: 400 });
    }
  }
  const existingMaximums = new Map(ownedComponents.map((component) => [component.id, component.maxScore]));
  if (body.rows.some((row) => componentMappings.some((mapping) =>
    !validateComponentScoreValue(
      row.rawData[mapping.sourceColumn],
      mapping.existingComponentId
        ? existingMaximums.get(mapping.existingComponentId) ?? mapping.maxScore
        : mapping.maxScore
    )
  ))) {
    return Response.json({ error: "Assessment component scores must be numeric and within their confirmed maximum" }, { status: 400 });
  }

  const result = await stageImportJob(jobId, teacher.schoolId, body.rows, {
    classId: body.classId,
    term: body.term,
    session: body.session,
    fullNameFormat: body.fullNameFormat,
    subjectCanonicalMap: body.subjectCanonicalMap,
    assessmentComponentMappings: componentMappings,
  });
  return Response.json(result);
}
