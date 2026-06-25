"use client";

import * as XLSX from "xlsx";

export function downloadExcel(data: Record<string, unknown>[], fileName: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportExamToExcel(
  exam: { title: string; subject: string; classLevel: string; examType: string },
  questions: {
    number: number;
    section: string;
    type: string;
    stem: string;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
    optionE?: string | null;
    correctOption?: string | null;
    solution: string;
    explanation: string;
    difficulty?: string | null;
  }[],
) {
  const rows = questions.map((q) => ({
    "#": q.number,
    Section: q.section,
    Type: q.type,
    Question: q.stem,
    "Option A": q.optionA ?? "",
    "Option B": q.optionB ?? "",
    "Option C": q.optionC ?? "",
    "Option D": q.optionD ?? "",
    "Option E": q.optionE ?? "",
    "Correct Answer": q.correctOption ?? "",
    Solution: q.solution,
    Explanation: q.explanation,
    Difficulty: q.difficulty ?? "",
  }));

  const slug = exam.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  downloadExcel(rows, `${slug}_questions`, exam.title);
}

export function exportScoresToExcel(
  className: string,
  subject: string,
  term: string,
  scores: {
    studentName: string;
    regNumber?: string | null;
    ca1?: number | null;
    ca2?: number | null;
    exam?: number | null;
    total?: number | null;
    grade?: string | null;
  }[],
) {
  const rows = scores.map((s, i) => ({
    "#": i + 1,
    "Student Name": s.studentName,
    "Reg Number": s.regNumber ?? "",
    "CA1 (20)": s.ca1 ?? "",
    "CA2 (20)": s.ca2 ?? "",
    "Exam (60)": s.exam ?? "",
    "Total (100)": s.total ?? "",
    Grade: s.grade ?? "",
  }));

  const slug = `${className}_${subject}_${term}`.replace(/[^a-zA-Z0-9]/g, "_");
  downloadExcel(rows, slug, `${className} - ${subject}`);
}

export function exportReportCard(
  student: { name: string; regNumber?: string | null; className: string },
  term: string,
  session: string,
  scores: {
    subject: string;
    ca1?: number | null;
    ca2?: number | null;
    exam?: number | null;
    total?: number | null;
    grade?: string | null;
    remark?: string | null;
  }[],
  summary: {
    totalScore: number;
    averageScore: number;
    subjectCount: number;
    position?: string;
  },
) {
  const header = [
    ["STUDENT REPORT CARD"],
    ["Name:", student.name, "", "Class:", student.className],
    ["Reg No:", student.regNumber ?? "N/A", "", "Term:", term],
    ["Session:", session],
    [],
    ["Subject", "CA1 (20)", "CA2 (20)", "Exam (60)", "Total (100)", "Grade", "Remark"],
  ];

  const rows = scores.map((s) => [
    s.subject,
    s.ca1 ?? "",
    s.ca2 ?? "",
    s.exam ?? "",
    s.total ?? "",
    s.grade ?? "",
    s.remark ?? "",
  ]);

  const footer = [
    [],
    ["", "", "", "Total Score:", summary.totalScore, "", ""],
    ["", "", "", "Average:", summary.averageScore.toFixed(1), "", ""],
    ["", "", "", "Subjects:", summary.subjectCount, "", ""],
    ...(summary.position ? [["", "", "", "Position:", summary.position, "", ""]] : []),
    [],
    ["Teacher's Signature: _______________", "", "", "Principal's Signature: _______________"],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);

  ws["!cols"] = [
    { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report Card");

  const slug = student.name.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `Report_Card_${slug}_${term}.xlsx`);
}
