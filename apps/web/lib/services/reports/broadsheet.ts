// Broadsheet generator — exports class result data as Excel.
// Uses the xlsx library already installed in the project.

import * as XLSX from "xlsx";
import type { ClassAnalytics } from "@/lib/services/analytics/calculator";

export function generateBroadsheetBuffer(analytics: ClassAnalytics): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──────────────────────────────────────────────
  const summaryData = [
    ["Class", analytics.className],
    ["Term", analytics.term],
    ["Session", analytics.session],
    ["Total Students", analytics.studentCount],
    ["Class Average", analytics.classAverage],
    ["Highest Average", analytics.highestAverage],
    ["Lowest Average", analytics.lowestAverage],
    ["Pass Rate", `${analytics.passRate}%`],
    ["Fail Rate", `${analytics.failRate}%`],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // ── Broadsheet (students × subjects) ─────────────────────────
  const subjects = analytics.subjectStats.map((s) => s.subject).sort();
  const header = [
    "#",
    "Reg. No.",
    "Last Name",
    "First Name",
    "Gender",
    ...subjects.flatMap((s) => [`${s} (CA)`, `${s} (Exam)`, `${s} (Total)`, `${s} (Grade)`]),
    "Average",
    "Position",
    "Pass",
    "Fail",
  ];

  const rows = analytics.students
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((student, idx) => {
      const subjectCols = subjects.flatMap((subName) => {
        const sub = student.subjects.find((s) => s.subject === subName);
        return [
          sub?.ca1 !== null && sub?.ca1 !== undefined ? sub.ca1 : "—",
          sub?.exam !== null && sub?.exam !== undefined ? sub.exam : "—",
          sub?.total !== null && sub?.total !== undefined ? sub.total : "—",
          sub?.grade ?? "—",
        ];
      });
      return [
        idx + 1,
        student.regNumber ?? "—",
        student.lastName,
        student.firstName,
        student.gender ?? "—",
        ...subjectCols,
        student.average ?? "—",
        student.position ?? "—",
        student.passCount,
        student.failCount,
      ];
    });

  const broadsheetWs = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Bold header row
  const range = XLSX.utils.decode_range(broadsheetWs["!ref"] ?? "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!broadsheetWs[addr]) continue;
    broadsheetWs[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: "EFEFEF" } } };
  }

  // Column widths
  broadsheetWs["!cols"] = header.map((h) =>
    String(h).includes("(") ? { wch: 10 } : { wch: 16 }
  );

  XLSX.utils.book_append_sheet(wb, broadsheetWs, "Broadsheet");

  // ── Subject Stats sheet ────────────────────────────────────────
  const statsHeader = ["Subject", "Students", "Average", "Highest", "Lowest", "Median", "Pass Rate", "Fail Rate", "A", "B", "C", "D", "E", "F"];
  const statsRows = analytics.subjectStats.map((s) => [
    s.subject,
    s.count,
    s.average,
    s.highest,
    s.lowest,
    s.median,
    `${s.passRate}%`,
    `${s.failRate}%`,
    s.gradeDistribution["A"] ?? 0,
    s.gradeDistribution["B"] ?? 0,
    s.gradeDistribution["C"] ?? 0,
    s.gradeDistribution["D"] ?? 0,
    s.gradeDistribution["E"] ?? 0,
    s.gradeDistribution["F"] ?? 0,
  ]);
  const statsWs = XLSX.utils.aoa_to_sheet([statsHeader, ...statsRows]);
  statsWs["!cols"] = statsHeader.map(() => ({ wch: 12 }));
  XLSX.utils.book_append_sheet(wb, statsWs, "Subject Stats");

  // ── Merit List ────────────────────────────────────────────────
  const meritHeader = ["Position", "Name", "Reg. No.", "Average", "Total Score", "Pass", "Fail"];
  const meritRows = analytics.students
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((s) => [
      s.position ?? "—",
      `${s.lastName} ${s.firstName}`,
      s.regNumber ?? "—",
      s.average ?? "—",
      s.totalScore,
      s.passCount,
      s.failCount,
    ]);
  const meritWs = XLSX.utils.aoa_to_sheet([meritHeader, ...meritRows]);
  XLSX.utils.book_append_sheet(wb, meritWs, "Merit List");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}

export function generateStudentReportData(
  analytics: ClassAnalytics,
  studentId: string
) {
  const student = analytics.students.find((s) => s.studentId === studentId);
  if (!student) throw new Error("Student not found in analytics");

  return {
    student,
    className: analytics.className,
    term: analytics.term,
    session: analytics.session,
    classAverage: analytics.classAverage,
    classSize: analytics.studentCount,
    subjectStats: analytics.subjectStats,
  };
}
