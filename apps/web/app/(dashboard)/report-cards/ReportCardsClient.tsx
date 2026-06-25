"use client";

import { useState, useCallback, useEffect } from "react";
import { getReportCardData } from "@/app/actions/report-cards";
import { exportReportCard, downloadExcel } from "@/lib/export";
import type { Term } from "@prisma/client";
import {
  FileText, Download, Loader2, Users,
  Trophy, ChevronDown, ChevronUp, Printer,
  FileSpreadsheet, Award,
} from "lucide-react";

type ClassInfo = { id: string; name: string; level: string; studentCount: number };

type StudentReport = {
  id: string;
  name: string;
  regNumber: string | null;
  scores: {
    subject: string;
    ca1: number | null;
    ca2: number | null;
    exam: number | null;
    total: number | null;
    grade: string | null;
    remark: string | null;
  }[];
  totalScore: number;
  averageScore: number;
  subjectCount: number;
  position: string;
};

type ReportData = {
  className: string;
  classLevel: string;
  term: Term;
  session: string;
  students: StudentReport[];
  totalStudents: number;
};

const TERMS: { value: Term; label: string }[] = [
  { value: "FIRST", label: "First Term" },
  { value: "SECOND", label: "Second Term" },
  { value: "THIRD", label: "Third Term" },
];

function gradeColor(grade: string | null): string {
  if (!grade) return "text-muted";
  if (grade === "A") return "text-emerald-600 dark:text-emerald-400";
  if (grade === "B") return "text-blue-600 dark:text-blue-400";
  if (grade === "C") return "text-amber-600 dark:text-amber-400";
  if (grade === "D") return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function ReportCardsClient({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState<Term>("FIRST");
  const [session, setSession] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setExpandedId(null);
    try {
      const result = await getReportCardData(classId, term, session);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [classId, term, session]);

  useEffect(() => {
    if (classId) loadData();
  }, [classId, term, session, loadData]);

  function handleExportStudent(student: StudentReport) {
    if (!data) return;
    exportReportCard(
      { name: student.name, regNumber: student.regNumber, className: data.className },
      data.term.charAt(0) + data.term.slice(1).toLowerCase() + " Term",
      data.session,
      student.scores,
      {
        totalScore: student.totalScore,
        averageScore: student.averageScore,
        subjectCount: student.subjectCount,
        position: student.position,
      },
    );
  }

  function handleExportAll() {
    if (!data) return;
    const allSubjects = new Set<string>();
    data.students.forEach((s) => s.scores.forEach((sc) => allSubjects.add(sc.subject)));

    const rows = data.students.map((s) => {
      const row: Record<string, unknown> = {
        "#": data.students.indexOf(s) + 1,
        "Student Name": s.name,
        "Reg Number": s.regNumber ?? "",
      };
      for (const subject of allSubjects) {
        const sc = s.scores.find((x) => x.subject === subject);
        row[`${subject} (Total)`] = sc?.total ?? "";
        row[`${subject} (Grade)`] = sc?.grade ?? "";
      }
      row["Grand Total"] = s.totalScore;
      row["Average"] = s.averageScore.toFixed(1);
      row["Position"] = s.position;
      return row;
    });

    const slug = `${data.className}_${data.term}_${data.session}`.replace(/[^a-zA-Z0-9]/g, "_");
    downloadExcel(rows, `${slug}_report_cards`, "Report Cards");
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users size={48} className="text-border mb-4" />
        <h2 className="text-lg font-bold text-text mb-1">No Classes Yet</h2>
        <p className="text-sm text-muted">Create a class and enter scores first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary-50 p-2.5 rounded-xl">
          <Award size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text">Report Cards</h1>
          <p className="text-xs text-muted">Termly student report cards with CA & exam scores</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level}) — {c.studentCount} students
            </option>
          ))}
        </select>

        <select
          value={term}
          onChange={(e) => setTerm(e.target.value as Term)}
          className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          type="text"
          value={session}
          onChange={(e) => setSession(e.target.value)}
          placeholder="2025/2026"
          className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {!classId && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText size={40} className="text-border mb-3" />
          <p className="text-sm text-muted">Select a class, term, and session to generate report cards</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary + export all */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
            <div>
              <p className="text-sm font-bold text-text">{data.className}</p>
              <p className="text-xs text-muted">
                {term.charAt(0) + term.slice(1).toLowerCase()} Term · {session} · {data.totalStudents} students with scores
              </p>
            </div>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <FileSpreadsheet size={14} />Export All
            </button>
          </div>

          {data.students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={32} className="text-border mb-2" />
              <p className="text-sm text-muted">No scores found for this term and session</p>
              <p className="text-xs text-muted mt-1">Enter scores in the Scores page first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.students.map((student, idx) => {
                const isExpanded = expandedId === student.id;
                return (
                  <div key={student.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Student row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : student.id)}
                      className="w-full flex items-center gap-3 p-3 md:p-4 text-left hover:bg-bg/50 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{student.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {student.regNumber && (
                            <span className="text-[10px] text-muted">{student.regNumber}</span>
                          )}
                          <span className="text-[10px] font-bold text-primary">
                            Avg: {student.averageScore.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted">
                            {student.subjectCount} subjects
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-text">{student.position}</p>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                      </div>
                    </button>

                    {/* Expanded report card */}
                    {isExpanded && (
                      <div className="border-t border-border p-3 md:p-4 space-y-3">
                        {/* Score table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 pr-3 font-semibold text-text-2">Subject</th>
                                <th className="text-center py-2 px-2 font-semibold text-text-2 w-14">CA1</th>
                                <th className="text-center py-2 px-2 font-semibold text-text-2 w-14">CA2</th>
                                <th className="text-center py-2 px-2 font-semibold text-text-2 w-14">Exam</th>
                                <th className="text-center py-2 px-2 font-semibold text-text-2 w-14">Total</th>
                                <th className="text-center py-2 px-2 font-semibold text-text-2 w-12">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.scores.map((sc) => (
                                <tr key={sc.subject} className="border-b border-border/50 last:border-0">
                                  <td className="py-2 pr-3 font-medium text-text">{sc.subject}</td>
                                  <td className="text-center py-2 px-2 text-text-2">{sc.ca1 ?? "-"}</td>
                                  <td className="text-center py-2 px-2 text-text-2">{sc.ca2 ?? "-"}</td>
                                  <td className="text-center py-2 px-2 text-text-2">{sc.exam ?? "-"}</td>
                                  <td className="text-center py-2 px-2 font-bold text-text">{sc.total ?? "-"}</td>
                                  <td className={`text-center py-2 px-2 font-bold ${gradeColor(sc.grade)}`}>
                                    {sc.grade ?? "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-border">
                                <td className="py-2 pr-3 font-bold text-text">Grand Total</td>
                                <td colSpan={3}></td>
                                <td className="text-center py-2 px-2 font-bold text-primary text-sm">
                                  {student.totalScore}
                                </td>
                                <td></td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-3 text-text-2">Average</td>
                                <td colSpan={3}></td>
                                <td className="text-center py-1 px-2 font-bold text-text">
                                  {student.averageScore.toFixed(1)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleExportStudent(student)}
                            className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            <Download size={13} />Download Report Card
                          </button>
                          <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 bg-border/20 text-text-2 text-xs font-bold px-3 py-2 rounded-lg hover:bg-border/30 transition-colors"
                          >
                            <Printer size={13} />Print
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
