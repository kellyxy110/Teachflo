import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { suggestCanonicalSubjects } from "@/lib/services/import/subject-normalize";
import { z } from "zod";

const requestSchema = z.object({ values: z.array(z.string().trim().min(1).max(120)).min(1).max(100) }).strict();

// POST /api/subjects/suggest
// Body: { values: string[] } — distinct raw subject strings found in an import file.
// Returns a canonicalization suggestion per value (school alias > built-in synonym >
// as-entered). The caller (import UI) must let the teacher confirm or override each
// suggestion before it's used — this endpoint only suggests, never decides.
export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`subjects-suggest:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  let body: z.infer<typeof requestSchema>;
  try { body = requestSchema.parse(await request.json()); }
  catch { return Response.json({ error: "values must be an array of at most 100 subject names" }, { status: 400 }); }

  const suggestions = await suggestCanonicalSubjects(teacher.schoolId, body.values);
  return Response.json({ suggestions });
}
