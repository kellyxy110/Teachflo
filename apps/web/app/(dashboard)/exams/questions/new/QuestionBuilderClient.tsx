"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download, FileText, FileSpreadsheet,
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { ClassLevel, ExamType, Section } from "@prisma/client";

const CLASS_LEVELS: ClassLevel[] = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
const SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry", "Biology",
  "Agricultural Science", "Economics", "Government", "Literature in English",
  "Geography", "History", "Civic Education", "Christian Religious Studies",
  "Islamic Studies", "Further Mathematics", "Technical Drawing",
  "Food and Nutrition", "Computer Studies", "French",
];
const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "SCHOOL_TEST", label: "School Test" },
  { value: "SCHOOL_EXAM", label: "School Exam" },
  { value: "WAEC_MOCK", label: "WAEC Mock" },
  { value: "JAMB_PREP", label: "JAMB Prep" },
  { value: "JUPEB_PREP", label: "JUPEB Prep" },
];
const SECTIONS: { value: Section; label: string }[] = [
  { value: "A", label: "Section A (Objectives)" },
  { value: "B", label: "Section B (Theory)" },
  { value: "C", label: "Section C (Advanced)" },
];

type OptionFormat = "letters" | "numbers";
type CorrectLetter = "A" | "B" | "C" | "D" | "";

interface QuestionSlot {
  stem: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correct: CorrectLetter;
}

interface Meta {
  title: string;
  subject: string;
  classLevel: string;
  examType: ExamType;
  section: Section;
}

type ExamOption = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  classLevel: string;
  _count: { questions: number };
};

const PAGE_SIZE = 5;
const emptySlot = (): QuestionSlot => ({ stem: "", optA: "", optB: "", optC: "", optD: "", correct: "" });
const initialMeta = (): Meta => ({ title: "", subject: "", classLevel: "", examType: "SCHOOL_EXAM", section: "A" });

function optLabel(letter: "A" | "B" | "C" | "D", fmt: OptionFormat): string {
  if (fmt === "letters") return letter;
  const n = { A: "1", B: "2", C: "3", D: "4" }[letter];
  return `Option ${n}`;
}

function correctDisplay(letter: CorrectLetter, fmt: OptionFormat): string {
  if (!letter) return "";
  if (fmt === "letters") return letter;
  return String({ A: 1, B: 2, C: 3, D: 4 }[letter]);
}

export function QuestionBuilderClient({ exams }: { exams: ExamOption[] }) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta>(initialMeta());
  const [questions, setQuestions] = useState<QuestionSlot[]>(Array.from({ length: PAGE_SIZE }, emptySlot));
  const [page, setPage] = useState(0);
  const [optFmt, setOptFmt] = useState<OptionFormat>("letters");
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [examId, setExamId] = useState("");

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageQuestions = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const filledCount = questions.filter((q) => q.stem.trim()).length;

  function setMf<K extends keyof Meta>(k: K, v: Meta[K]) {
    setMeta((m) => ({ ...m, [k]: v }));
  }

  function setSlot(pageIdx: number, field: keyof QuestionSlot, value: string) {
    const absIdx = page * PAGE_SIZE + pageIdx;
    setQuestions((qs) => {
      const next = [...qs];
      next[absIdx] = { ...next[absIdx], [field]: value };
      return next;
    });
  }

  function addPage() {
    setQuestions((qs) => [...qs, ...Array.from({ length: PAGE_SIZE }, emptySlot)]);
    setPage(totalPages); // go to new page
  }

  // ── Excel download ──────────────────────────────────────────────────────────
  function downloadExcel() {
    const filled = questions.filter((q) => q.stem.trim());
    if (!filled.length) { setNotice({ type: "err", msg: "No questions to export." }); return; }

    const headers = [
      "No.", "Question",
      optFmt === "letters" ? "Option A" : "Option 1",
      optFmt === "letters" ? "Option B" : "Option 2",
      optFmt === "letters" ? "Option C" : "Option 3",
      optFmt === "letters" ? "Option D" : "Option 4",
      "Correct Answer",
    ];
    const rows = filled.map((q, i) => [
      i + 1,
      q.stem,
      q.optA,
      q.optB,
      q.optC,
      q.optD,
      correctDisplay(q.correct, optFmt),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Style column widths
    ws["!cols"] = [{ wch: 5 }, { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, `${meta.title || "exam-questions"}.xlsx`);
    setNotice({ type: "ok", msg: `Exported ${filled.length} questions to Excel.` });
  }

  // ── Word download ───────────────────────────────────────────────────────────
  function downloadWord() {
    const filled = questions.filter((q) => q.stem.trim());
    if (!filled.length) { setNotice({ type: "err", msg: "No questions to export." }); return; }

    const colH = (l: "A" | "B" | "C" | "D") => optFmt === "letters" ? `Option ${l}` : `Option ${{ A:1,B:2,C:3,D:4 }[l]}`;
    const rows = filled.map((q, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #ccc;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ccc">${q.stem.replace(/</g, "&lt;")}</td>
        <td style="padding:6px;border:1px solid #ccc">${q.optA.replace(/</g, "&lt;")}</td>
        <td style="padding:6px;border:1px solid #ccc">${q.optB.replace(/</g, "&lt;")}</td>
        <td style="padding:6px;border:1px solid #ccc">${q.optC.replace(/</g, "&lt;")}</td>
        <td style="padding:6px;border:1px solid #ccc">${q.optD.replace(/</g, "&lt;")}</td>
        <td style="padding:6px;border:1px solid #ccc;text-align:center;font-weight:bold">${correctDisplay(q.correct, optFmt)}</td>
      </tr>`).join("");

    const html = `
<html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;font-size:12pt;margin:30px}h2{margin-bottom:4px}p.sub{color:#555;font-size:10pt;margin-bottom:16px}table{border-collapse:collapse;width:100%}th{background:#f0f0f0;padding:6px 8px;border:1px solid #ccc;font-size:10pt}td{font-size:10pt}</style>
</head><body>
<h2>${(meta.title || "Exam Questions").replace(/</g,"&lt;")}</h2>
<p class="sub">${meta.subject || "Subject"} &bull; ${meta.classLevel || "Class"} &bull; ${EXAM_TYPES.find(t=>t.value===meta.examType)?.label ?? meta.examType} &bull; ${SECTIONS.find(s=>s.value===meta.section)?.label ?? meta.section}</p>
<table>
<thead><tr>
  <th style="width:40px">No.</th>
  <th>Question</th>
  <th style="width:120px">${colH("A")}</th>
  <th style="width:120px">${colH("B")}</th>
  <th style="width:120px">${colH("C")}</th>
  <th style="width:120px">${colH("D")}</th>
  <th style="width:70px">Answer</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</body></html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.title || "exam-questions"}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ type: "ok", msg: `Exported ${filled.length} questions to Word.` });
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Exam metadata */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-text text-sm">Exam Details</h3>

        {/* Existing exam selector */}
        {exams.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Add to existing exam (optional)</label>
            <select value={examId} onChange={(e) => setExamId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">— create new —</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.title} ({ex._count.questions} questions)</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-text-2 mb-1">Exam Title</label>
          <input type="text" value={meta.title} onChange={(e) => setMf("title", e.target.value)}
            placeholder="e.g. SS2 Biology 2nd Term Exam" maxLength={120}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-2 mb-1">Subject</label>
            <select value={meta.subject} onChange={(e) => setMf("subject", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select...</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Class</label>
            <select value={meta.classLevel} onChange={(e) => setMf("classLevel", e.target.value as ClassLevel)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select...</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Exam Type</label>
            <select value={meta.examType} onChange={(e) => setMf("examType", e.target.value as ExamType)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Section</label>
            <select value={meta.section} onChange={(e) => setMf("section", e.target.value as Section)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Option format toggle + summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-2">Option labels:</span>
          <button onClick={() => setOptFmt("letters")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${optFmt === "letters" ? "bg-primary text-white border-primary" : "bg-surface border-border text-text-2 hover:border-primary/40"}`}>
            A / B / C / D
          </button>
          <button onClick={() => setOptFmt("numbers")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${optFmt === "numbers" ? "bg-primary text-white border-primary" : "bg-surface border-border text-text-2 hover:border-primary/40"}`}>
            Option 1 / 2 / 3 / 4
          </button>
        </div>
        <span className="text-xs text-muted bg-surface border border-border px-3 py-1.5 rounded-lg">
          {filledCount} of {questions.length} questions filled
        </span>
      </div>

      {/* Question slots for current page */}
      <div className="space-y-4">
        {pageQuestions.map((q, pageIdx) => {
          const absIdx = page * PAGE_SIZE + pageIdx;
          const qNum = absIdx + 1;
          return (
            <div key={absIdx} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-bg border-b border-border flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">{qNum}</span>
                <span className="text-xs font-semibold text-text-2">Question {qNum}</span>
                {q.correct && (
                  <span className="ml-auto text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle size={11} />
                    Answer: {optFmt === "letters" ? q.correct : { A:"1",B:"2",C:"3",D:"4" }[q.correct]}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {/* Question text */}
                <textarea
                  value={q.stem}
                  onChange={(e) => setSlot(pageIdx, "stem", e.target.value)}
                  rows={2}
                  placeholder={`Type question ${qNum} here…`}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />

                {/* Options row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(["A", "B", "C", "D"] as const).map((letter) => {
                    const fieldKey = `opt${letter}` as "optA" | "optB" | "optC" | "optD";
                    const isCorrect = q.correct === letter;
                    return (
                      <div key={letter} className="flex items-center gap-2">
                        <button
                          onClick={() => setSlot(pageIdx, "correct", isCorrect ? "" : letter)}
                          title={isCorrect ? "Click to deselect" : `Mark as correct answer`}
                          className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                            isCorrect
                              ? "bg-success text-white border-success shadow-sm"
                              : "bg-bg text-text-2 border-border hover:border-success/50 hover:text-success"
                          }`}
                        >
                          {optFmt === "letters" ? letter : { A:"1",B:"2",C:"3",D:"4" }[letter]}
                        </button>
                        <input
                          type="text"
                          value={q[fieldKey]}
                          onChange={(e) => setSlot(pageIdx, fieldKey, e.target.value)}
                          placeholder={`${optLabel(letter, optFmt)}…`}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors text-text placeholder:text-muted bg-bg focus:outline-none focus:ring-2 ${
                            isCorrect
                              ? "border-success/50 focus:ring-success/20 bg-success/5"
                              : "border-border focus:ring-primary/20"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Page nav */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-border text-text-2 hover:border-primary/40 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Previous 5
        </button>

        <span className="text-xs text-muted">
          Page {page + 1} of {totalPages} &bull; Questions {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, questions.length)}
        </span>

        {page < totalPages - 1 ? (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-border text-text-2 hover:border-primary/40 hover:text-text transition-colors"
          >
            Next 5 <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={addPage}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus size={14} /> Add 5 more
          </button>
        )}
      </div>

      {/* Download actions */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-text text-sm mb-4">Download Question Paper</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <FileSpreadsheet size={16} /> Download as Excel (.xlsx)
          </button>
          <button
            onClick={downloadWord}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <FileText size={16} /> Download as Word (.doc)
          </button>
        </div>
        <p className="text-xs text-muted mt-3">
          Excel: columns A–F for questions and options, column G for correct answer.
          {optFmt === "numbers" && " Answers exported as numbers (1–4)."}
        </p>

        {notice && (
          <div className={`flex items-center gap-2 text-sm mt-3 ${notice.type === "ok" ? "text-success" : "text-danger"}`}>
            {notice.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {notice.msg}
          </div>
        )}
      </div>
    </div>
  );
}
