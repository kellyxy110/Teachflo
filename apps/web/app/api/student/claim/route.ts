import { safeAuth, safeCurrentUser } from "@/lib/auth";
import { authService } from "@/lib/auth/service";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { userId } = await safeAuth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`student-claim:${userId}`);
  if (!ok) return Response.json({ error: "Too many attempts" }, { status: 429 });

  const alreadyTeacher = await db.teacher.findUnique({ where: { clerkId: userId } });
  if (alreadyTeacher) {
    return Response.json({ error: "This account is already registered as a teacher" }, { status: 400 });
  }

  const alreadyStudent = await db.student.findFirst({ where: { clerkId: userId } });
  if (alreadyStudent) {
    return Response.json({ error: "This account is already linked to a student record" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;
  const schoolCode = typeof fields.schoolCode === "string" ? fields.schoolCode.trim() : "";
  const regNumber = typeof fields.regNumber === "string" ? fields.regNumber.trim() : "";

  if (!schoolCode || !regNumber || schoolCode.length > 64 || regNumber.length > 100) {
    return Response.json({ error: "School code and registration number are required" }, { status: 400 });
  }

  const school = await db.school.findUnique({ where: { code: schoolCode } });
  if (!school) {
    return Response.json({ error: "School not found. Check the school code and try again." }, { status: 404 });
  }

  const student = await db.student.findFirst({
    where: {
      schoolId: school.id,
      regNumber: { equals: regNumber, mode: "insensitive" },
    },
  });

  if (!student) {
    return Response.json({
      error: "No student found with that registration number at this school. Ask your teacher to add you.",
    }, { status: 404 });
  }

  if (student.clerkId) {
    return Response.json({ error: "This student record is already linked to another account" }, { status: 409 });
  }

  const currentUser = await safeCurrentUser();
  const email = currentUser?.email ?? null;

  // A conditional claim prevents two accounts from taking the same student
  // record. Keep identity creation in the same transaction so failures roll back.
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.student.updateMany({
        where: { id: student.id, schoolId: school.id, clerkId: null, isActive: true },
        data: { clerkId: userId, email },
      });
      if (claimed.count !== 1) throw new Error("STUDENT_ALREADY_CLAIMED");
      await tx.authIdentity.create({
        data: {
          provider: process.env.AUTH_PROVIDER === "supabase" ? "SUPABASE" : "CLERK",
          providerUserId: userId,
          studentId: student.id,
        },
      });
    });
  } catch {
    return Response.json({ error: "This student record could not be claimed. Check whether it is already linked." }, { status: 409 });
  }

  // Identity resolution is database-backed. A provider metadata outage must
  // not make an already-committed student claim appear to have failed.
  try {
    await authService.setUserMetadata(userId, {
      role: "student",
      schoolId: school.id,
      studentId: student.id,
    });
  } catch {
    // A later login can still resolve the persisted student identity.
  }

  return Response.json({ success: true, studentId: student.id });
}
