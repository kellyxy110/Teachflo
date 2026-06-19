"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function getAnalytics() {
  const { schoolId } = await requireSchool();

  const [scores, classes, students] = await Promise.all([
    db.score.findMany({
      where: { schoolId, total: { not: null } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true, level: true } },
      },
    }),
    db.class.findMany({ where: { schoolId }, select: { id: true, name: true, level: true } }),
    db.student.findMany({ where: { schoolId, isActive: true }, select: { id: true } }),
  ]);

  if (scores.length === 0) return null;

  // ── Grade helpers ─────────────────────────────────────────────
  function gradeLabel(total: number): string {
    if (total >= 70) return "A";
    if (total >= 60) return "B";
    if (total >= 50) return "C";
    if (total >= 45) return "D";
    if (total >= 40) return "E";
    return "F";
  }

  function isAtRisk(total: number) {
    return total < 50;
  }

  // ── Overall stats ─────────────────────────────────────────────
  const totals = scores.map((s) => s.total!);
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const passCount = totals.filter((t) => t >= 50).length;
  const passRate = Math.round((passCount / totals.length) * 100);

  // ── Grade distribution ────────────────────────────────────────
  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (const t of totals) gradeCounts[gradeLabel(t)]++;

  // ── Subject breakdown ─────────────────────────────────────────
  const subjectMap: Record<string, number[]> = {};
  for (const s of scores) {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = [];
    subjectMap[s.subject].push(s.total!);
  }
  const subjectStats = Object.entries(subjectMap)
    .map(([subject, vals]) => ({
      subject,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      count: vals.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  // ── Class breakdown ───────────────────────────────────────────
  const classMap: Record<string, { name: string; level: string; totals: number[] }> = {};
  for (const s of scores) {
    const key = s.class.id;
    if (!classMap[key]) classMap[key] = { name: s.class.name, level: s.class.level, totals: [] };
    classMap[key].totals.push(s.total!);
  }
  const classStats = Object.values(classMap)
    .map(({ name, level, totals }) => ({
      name,
      level,
      avg: Math.round(totals.reduce((a, b) => a + b, 0) / totals.length),
      count: totals.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  // ── At-risk students ──────────────────────────────────────────
  const studentRisk: Record<
    string,
    { id: string; name: string; className: string; scores: number[]; failCount: number }
  > = {};
  for (const s of scores) {
    const sid = s.student.id;
    if (!studentRisk[sid]) {
      studentRisk[sid] = {
        id: sid,
        name: `${s.student.firstName} ${s.student.lastName}`,
        className: s.class.name,
        scores: [],
        failCount: 0,
      };
    }
    studentRisk[sid].scores.push(s.total!);
    if (isAtRisk(s.total!)) studentRisk[sid].failCount++;
  }
  const atRisk = Object.values(studentRisk)
    .filter((s) => s.failCount > 0)
    .map((s) => ({
      ...s,
      avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
    }))
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 10);

  return {
    totalScores: scores.length,
    totalStudents: students.length,
    totalClasses: classes.length,
    avg: Math.round(avg),
    passRate,
    gradeCounts,
    subjectStats,
    classStats,
    atRisk,
  };
}
