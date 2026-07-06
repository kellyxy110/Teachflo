// Class Workspace Provisioner
// After any import, ensure the class has all the workspace markers it needs.
// This is a lightweight pass — it does not delete or overwrite existing records.

import { db } from "@/lib/db";

export interface WorkspaceProvisionResult {
  classId: string;
  studentCount: number;
  subjectCount: number;
  alreadyProvisioned: boolean;
}

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  JS1: ["English Language", "Mathematics", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "Agricultural Science", "French", "Christian Religious Studies", "Islamic Religious Studies", "Physical and Health Education", "Cultural and Creative Art", "Computer Studies"],
  JS2: ["English Language", "Mathematics", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "Agricultural Science", "French", "Christian Religious Studies", "Islamic Religious Studies", "Physical and Health Education", "Cultural and Creative Art", "Computer Studies"],
  JS3: ["English Language", "Mathematics", "Basic Science", "Basic Technology", "Social Studies", "Civic Education", "Agricultural Science", "French", "Christian Religious Studies", "Islamic Religious Studies", "Physical and Health Education", "Cultural and Creative Art", "Computer Studies"],
  SS1: ["English Language", "Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English", "Geography", "Commerce", "Accounts", "Christian Religious Studies", "Islamic Religious Studies", "Agricultural Science", "French", "Yoruba", "Igbo", "Hausa", "Computer Science", "Physical Education"],
  SS2: ["English Language", "Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English", "Geography", "Commerce", "Accounts", "Christian Religious Studies", "Islamic Religious Studies", "Agricultural Science", "French", "Computer Science"],
  SS3: ["English Language", "Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English", "Geography", "Commerce", "Accounts", "Christian Religious Studies", "Islamic Religious Studies", "Agricultural Science", "French", "Computer Science"],
};

export async function provisionClassWorkspace(
  classId: string,
  schoolId: string
): Promise<WorkspaceProvisionResult> {
  const cls = await db.class.findFirst({
    where: { id: classId, schoolId },
    include: {
      students: { where: { isActive: true }, select: { id: true } },
      _count: { select: { scores: true } },
    },
  });

  if (!cls) throw new Error("Class not found");

  const studentCount = cls.students.length;
  const subjectCount = SUBJECTS_BY_LEVEL[cls.level]?.length ?? 0;
  const alreadyProvisioned = cls._count.scores > 0;

  // Nothing structural to provision beyond what the import already created.
  // The workspace (lessons, exams, attendance, etc.) is empty by design —
  // teachers populate those organically. We just return the status.

  return { classId, studentCount, subjectCount, alreadyProvisioned };
}

export function getDefaultSubjectsForLevel(level: string): string[] {
  return SUBJECTS_BY_LEVEL[level] ?? [];
}
