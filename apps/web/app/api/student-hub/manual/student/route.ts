import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import type { Gender } from "@prisma/client";

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`manual-student:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const body = await request.json() as {
    firstName: string;
    lastName: string;
    regNumber?: string | null;
    gender?: string | null;
    classId: string;
    schoolId: string;
  };

  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return Response.json({ error: "First and last name are required" }, { status: 400 });
  }
  if (!body.classId) return Response.json({ error: "classId is required" }, { status: 400 });
  if (body.schoolId !== teacher.schoolId) return Response.json({ error: "School mismatch" }, { status: 403 });

  const cls = await db.class.findFirst({ where: { id: body.classId, schoolId: teacher.schoolId } });
  if (!cls) return Response.json({ error: "Class not found" }, { status: 404 });

  const validGenders = ["MALE", "FEMALE"];
  const gender = body.gender && validGenders.includes(body.gender.toUpperCase())
    ? (body.gender.toUpperCase() as Gender)
    : null;

  const student = await db.student.create({
    data: {
      schoolId: teacher.schoolId,
      classId: body.classId,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      regNumber: body.regNumber?.trim() || null,
      gender,
    },
    select: { id: true, firstName: true, lastName: true, regNumber: true, gender: true },
  });

  return Response.json({ student });
}
