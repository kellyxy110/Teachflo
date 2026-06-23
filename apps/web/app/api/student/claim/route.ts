import { safeAuth } from "@/lib/auth";
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

  const body = await request.json();
  const { schoolCode, regNumber } = body as { schoolCode?: string; regNumber?: string };

  if (!schoolCode || !regNumber) {
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

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;

  await db.student.update({
    where: { id: student.id },
    data: { clerkId: userId, email },
  });

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: "student",
      schoolId: school.id,
      studentId: student.id,
    },
  });

  return Response.json({ success: true, studentId: student.id });
}
