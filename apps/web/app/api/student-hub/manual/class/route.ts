import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import type { ClassLevel, Term } from "@prisma/client";

const VALID_LEVELS = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"] as const;
const VALID_TERMS = ["FIRST", "SECOND", "THIRD"] as const;

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`manual-class:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const body = await request.json() as {
    name: string;
    level: string;
    term: string;
    session: string;
    schoolId: string;
  };

  if (!body.name?.trim()) return Response.json({ error: "Class name is required" }, { status: 400 });
  if (!VALID_LEVELS.includes(body.level as ClassLevel)) return Response.json({ error: "Invalid level" }, { status: 400 });
  if (!VALID_TERMS.includes(body.term as Term)) return Response.json({ error: "Invalid term" }, { status: 400 });
  if (body.schoolId !== teacher.schoolId) return Response.json({ error: "School mismatch" }, { status: 403 });

  const cls = await db.class.create({
    data: {
      schoolId: teacher.schoolId,
      name: body.name.trim(),
      level: body.level as ClassLevel,
      term: body.term as Term,
      session: body.session || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    },
    select: { id: true, name: true, level: true, term: true, session: true },
  }).catch((e: { code?: string }) => {
    if (e?.code === "P2002") throw new Error("A class with this name already exists for that session");
    throw e;
  });

  await db.syncLog.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      type: "MANUAL",
      source: "MANUAL",
      status: "COMPLETED",
      summary: { action: "class_created", classId: cls.id, name: cls.name },
      completedAt: new Date(),
    },
  });

  return Response.json({ class: cls });
}
