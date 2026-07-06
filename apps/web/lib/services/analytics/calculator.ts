// Analytics Calculator — pure mathematics only.
// No AI, no predictions, no estimates. Only direct computation from imported records.

import { db } from "@/lib/db";

export interface SubjectStats {
  subject: string;
  count: number;
  average: number;
  highest: number;
  lowest: number;
  median: number;
  passRate: number;
  failRate: number;
  gradeDistribution: Record<string, number>;
  scoreDistribution: { range: string; count: number }[];
}

export interface StudentSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  gender: string | null;
  subjects: { subject: string; ca1: number | null; ca2: number | null; exam: number | null; total: number | null; grade: string | null }[];
  average: number | null;
  totalScore: number;
  subjectCount: number;
  position: number | null;
  passCount: number;
  failCount: number;
}

export interface ClassAnalytics {
  classId: string;
  className: string;
  term: string;
  session: string;
  studentCount: number;
  subjectCount: number;
  classAverage: number;
  highestAverage: number;
  lowestAverage: number;
  passRate: number;
  failRate: number;
  gradeDistribution: Record<string, number>;
  subjectStats: SubjectStats[];
  students: StudentSummary[];
  topPerformers: StudentSummary[];
  bottomPerformers: StudentSummary[];
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function grade(total: number | null): string {
  if (total === null) return "—";
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}

export async function computeClassAnalytics(
  classId: string,
  schoolId: string,
  term?: string,
  session?: string
): Promise<ClassAnalytics> {
  const cls = await db.class.findFirst({
    where: { id: classId, schoolId },
    include: {
      students: {
        where: { isActive: true },
        include: {
          scores: {
            where: {
              ...(term ? { term: term as "FIRST" | "SECOND" | "THIRD" } : {}),
              ...(session ? { session } : {}),
            },
          },
        },
      },
    },
  });

  if (!cls) throw new Error("Class not found");

  const studentSummaries: StudentSummary[] = [];
  const allSubjectNames = new Set<string>();

  for (const student of cls.students) {
    for (const s of student.scores) allSubjectNames.add(s.subject);
  }

  for (const student of cls.students) {
    const subjects = student.scores.map((s) => ({
      subject: s.subject,
      ca1: s.ca1,
      ca2: s.ca2,
      exam: s.exam,
      total: s.total,
      grade: s.grade ?? grade(s.total),
    }));

    const totals = subjects.map((s) => s.total).filter((t): t is number => t !== null);
    const avg = totals.length > 0 ? round2(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
    const passCount = subjects.filter((s) => (s.total ?? 0) >= 40).length;
    const failCount = subjects.filter((s) => s.total !== null && s.total < 40).length;

    studentSummaries.push({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      regNumber: student.regNumber,
      gender: student.gender,
      subjects,
      average: avg,
      totalScore: totals.reduce((a, b) => a + b, 0),
      subjectCount: totals.length,
      position: null,
      passCount,
      failCount,
    });
  }

  // Rank by average (descending); null averages go last
  const ranked = [...studentSummaries].sort((a, b) => {
    if (a.average === null && b.average === null) return 0;
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return b.average - a.average;
  });

  ranked.forEach((s, i) => {
    const actual = studentSummaries.find((x) => x.studentId === s.studentId);
    if (actual) actual.position = i + 1;
  });

  // Per-subject stats
  const subjectStats: SubjectStats[] = [];
  for (const subjectName of allSubjectNames) {
    const scores = cls.students
      .flatMap((st) => st.scores.filter((s) => s.subject === subjectName))
      .map((s) => s.total)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);

    if (scores.length === 0) continue;

    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = round2(sum / scores.length);
    const passes = scores.filter((s) => s >= 40).length;
    const passRate = round2((passes / scores.length) * 100);

    const gradeDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    scores.forEach((s) => { gradeDist[grade(s)]++; });

    const ranges = [
      { range: "90-100", min: 90, max: 100 },
      { range: "80-89", min: 80, max: 89 },
      { range: "70-79", min: 70, max: 79 },
      { range: "60-69", min: 60, max: 69 },
      { range: "50-59", min: 50, max: 59 },
      { range: "40-49", min: 40, max: 49 },
      { range: "0-39", min: 0, max: 39 },
    ];
    const scoreDistribution = ranges.map(({ range, min, max }) => ({
      range,
      count: scores.filter((s) => s >= min && s <= max).length,
    }));

    subjectStats.push({
      subject: subjectName,
      count: scores.length,
      average: avg,
      highest: scores[scores.length - 1],
      lowest: scores[0],
      median: round2(median(scores)),
      passRate,
      failRate: round2(100 - passRate),
      gradeDistribution: gradeDist,
      scoreDistribution,
    });
  }

  // Class-level aggregates
  const averages = studentSummaries.map((s) => s.average).filter((a): a is number => a !== null);
  const classAverage =
    averages.length > 0 ? round2(averages.reduce((a, b) => a + b, 0) / averages.length) : 0;

  const allTotals = cls.students
    .flatMap((st) => st.scores.map((s) => s.total))
    .filter((t): t is number => t !== null);
  const totalPasses = allTotals.filter((t) => t >= 40).length;
  const passRate = allTotals.length > 0 ? round2((totalPasses / allTotals.length) * 100) : 0;

  const globalGradeDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  allTotals.forEach((t) => { globalGradeDist[grade(t)]++; });

  const top5 = ranked.slice(0, 5);
  const bottom5 = ranked.slice(-5).reverse();

  return {
    classId,
    className: cls.name,
    term: cls.term,
    session: cls.session,
    studentCount: cls.students.length,
    subjectCount: allSubjectNames.size,
    classAverage,
    highestAverage: averages.length > 0 ? Math.max(...averages) : 0,
    lowestAverage: averages.length > 0 ? Math.min(...averages) : 0,
    passRate,
    failRate: round2(100 - passRate),
    gradeDistribution: globalGradeDist,
    subjectStats,
    students: studentSummaries,
    topPerformers: top5,
    bottomPerformers: bottom5,
  };
}
