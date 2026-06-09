"use client";

import { useState, useTransition } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { calculateGrade, calculateTotal } from "@teachflow/shared";
import { upsertScore } from "@/app/actions/scores";
import { Save, CheckCircle } from "lucide-react";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  scores: Array<{
    id: string;
    ca1: number | null;
    ca2: number | null;
    exam: number | null;
    total: number | null;
    grade: string | null;
  }>;
};

type ScoreRow = {
  ca1: string;
  ca2: string;
  exam: string;
};

export function ScoreTable({
  students,
  classId,
  subject,
  term,
  session,
}: {
  students: Student[];
  classId: string;
  subject: string;
  term: string;
  session: string;
}) {
  const [rows, setRows] = useState<Record<string, ScoreRow>>(() => {
    const initial: Record<string, ScoreRow> = {};
    for (const s of students) {
      const score = s.scores[0];
      initial[s.id] = {
        ca1: score?.ca1?.toString() ?? "",
        ca2: score?.ca2?.toString() ?? "",
        exam: score?.exam?.toString() ?? "",
      };
    }
    return initial;
  });

  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function updateCell(studentId: string, field: keyof ScoreRow, value: string) {
    // Allow only numbers up to field max
    const numeric = value.replace(/[^0-9.]/g, "");
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: numeric },
    }));
    setSaved((prev) => ({ ...prev, [studentId]: false }));
  }

  function getComputed(studentId: string) {
    const row = rows[studentId];
    const ca1 = parseFloat(row?.ca1 || "0") || 0;
    const ca2 = parseFloat(row?.ca2 || "0") || 0;
    const exam = parseFloat(row?.exam || "0") || 0;
    const total = calculateTotal(ca1, ca2, exam);
    const grade = calculateGrade(total);
    return { total, grade };
  }

  function saveRow(studentId: string) {
    const row = rows[studentId];
    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("classId", classId);
    fd.set("subject", subject);
    fd.set("term", term);
    fd.set("session", session);
    fd.set("ca1", row.ca1 || "0");
    fd.set("ca2", row.ca2 || "0");
    fd.set("exam", row.exam || "0");

    startTransition(async () => {
      await upsertScore(fd);
      setSaved((prev) => ({ ...prev, [studentId]: true }));
    });
  }

  function saveAll() {
    startTransition(async () => {
      for (const studentId of Object.keys(rows)) {
        const row = rows[studentId];
        const fd = new FormData();
        fd.set("studentId", studentId);
        fd.set("classId", classId);
        fd.set("subject", subject);
        fd.set("term", term);
        fd.set("session", session);
        fd.set("ca1", row.ca1 || "0");
        fd.set("ca2", row.ca2 || "0");
        fd.set("exam", row.exam || "0");
        await upsertScore(fd);
      }
      setSaved(Object.fromEntries(Object.keys(rows).map((id) => [id, true])));
    });
  }

  if (students.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <p className="font-medium text-text">No students in this class</p>
        <p className="text-sm text-text-2 mt-1">
          Add students to this class first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            {subject} — {term.charAt(0) + term.slice(1).toLowerCase()} Term
          </h3>
          <p className="text-xs text-muted mt-0.5">
            CA1 /20 · CA2 /20 · Exam /60 · Total /100
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          <Save size={13} />
          Save All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left bg-bg">
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-8">#</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2">Student</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-20 text-center">CA1</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-20 text-center">CA2</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-20 text-center">Exam</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-20 text-center">Total</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-16 text-center">Grade</th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student, i) => {
              const { total, grade } = getComputed(student.id);
              const row = rows[student.id];
              const isSaved = saved[student.id];

              return (
                <tr key={student.id} className="hover:bg-bg/50 transition-colors">
                  <td className="px-4 py-2 text-xs text-text-2">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-text">
                    {student.lastName}, {student.firstName}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row?.ca1 ?? ""}
                      onChange={(e) => updateCell(student.id, "ca1", e.target.value)}
                      onBlur={() => saveRow(student.id)}
                      placeholder="0"
                      maxLength={4}
                      className="w-16 px-2 py-1.5 border border-border rounded text-sm text-center text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row?.ca2 ?? ""}
                      onChange={(e) => updateCell(student.id, "ca2", e.target.value)}
                      onBlur={() => saveRow(student.id)}
                      placeholder="0"
                      maxLength={4}
                      className="w-16 px-2 py-1.5 border border-border rounded text-sm text-center text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row?.exam ?? ""}
                      onChange={(e) => updateCell(student.id, "exam", e.target.value)}
                      onBlur={() => saveRow(student.id)}
                      placeholder="0"
                      maxLength={4}
                      className="w-16 px-2 py-1.5 border border-border rounded text-sm text-center text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="text-sm font-semibold text-text">{total}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <GradeBadge grade={grade} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isSaved && (
                      <CheckCircle size={14} className="text-success mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
