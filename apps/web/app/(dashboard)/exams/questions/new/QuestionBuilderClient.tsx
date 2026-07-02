"use client";

import { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  FileText, FileSpreadsheet, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, Plus, Edit3, GraduationCap, User,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { ClassLevel, ExamType, Section } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────

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
const PAGE_SIZE = 5;
const LETTERS = ["A", "B", "C", "D", "E"] as const;

// ── Types ─────────────────────────────────────────────────────────

type CorrectLetter = "A" | "B" | "C" | "D" | "E" | "";
type Tab = "edit" | "student" | "teacher";

interface QuestionSlot {
  stem: string;
  optA: string; optB: string; optC: string; optD: string; optE: string;
  correct: CorrectLetter;
}
interface Meta {
  title: string; subject: string; classLevel: string;
  examType: ExamType; section: Section;
}
type ExamOption = {
  id: string; title: string; subject: string; topic: string;
  classLevel: string; _count: { questions: number };
};

const emptySlot = (): QuestionSlot => ({ stem: "", optA: "", optB: "", optC: "", optD: "", optE: "", correct: "" });
const initialMeta = (): Meta => ({ title: "", subject: "", classLevel: "", examType: "SCHOOL_EXAM", section: "A" });

// ── Math helpers ──────────────────────────────────────────────────

function htmlEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Converts $...$ and $$...$$ to KaTeX HTML. Plain text is HTML-escaped.
function renderMathHtml(raw: string): string {
  const parts = raw.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return parts.map((part) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const tex = part.slice(2, -2).trim();
      try { return katex.renderToString(tex, { displayMode: true, throwOnError: false }); }
      catch { return htmlEsc(part); }
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      const tex = part.slice(1, -1).trim();
      try { return katex.renderToString(tex, { throwOnError: false }); }
      catch { return htmlEsc(part); }
    }
    return htmlEsc(part);
  }).join("");
}

// Strips $ delimiters for Excel plain-text export
function stripMath(raw: string): string {
  return raw.replace(/\$\$?([^$]+?)\$\$?/g, (_, tex) => tex.trim()).trim();
}

function getOpt(q: QuestionSlot, l: typeof LETTERS[number]): string {
  return { A: q.optA, B: q.optB, C: q.optC, D: q.optD, E: q.optE }[l];
}

// ── Shared styles ─────────────────────────────────────────────────

const iCls = "w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20";
const sCls = "w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20";

// ── Main Component ────────────────────────────────────────────────

export function QuestionBuilderClient({ exams }: { exams: ExamOption[] }) {
  const [meta, setMeta] = useState<Meta>(initialMeta());
  const [questions, setQuestions] = useState<QuestionSlot[]>(Array.from({ length: PAGE_SIZE }, emptySlot));
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<Tab>("edit");
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [examId, setExamId] = useState("");

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageQs = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const filledCount = questions.filter((q) => q.stem.trim()).length;

  function setMf<K extends keyof Meta>(k: K, v: Meta[K]) { setMeta((m) => ({ ...m, [k]: v })); }

  function setSlot(pageIdx: number, field: keyof QuestionSlot, value: string) {
    const abs = page * PAGE_SIZE + pageIdx;
    setQuestions((qs) => {
      const next = [...qs];
      next[abs] = { ...next[abs], [field]: value };
      return next;
    });
  }

  function addPage() {
    setQuestions((qs) => [...qs, ...Array.from({ length: PAGE_SIZE }, emptySlot)]);
    setPage(totalPages);
  }

  // ── Validation ────────────────────────────────────────────────

  function validate(): string[] {
    const errs: string[] = [];
    let count = 0;
    questions.forEach((q, i) => {
      if (!q.stem.trim()) return;
      count++;
      if (!q.correct) errs.push(`Question ${i + 1} has no correct answer selected. Please mark the correct answer before exporting.`);
    });
    if (count === 0) return ["No questions to export. Please fill in at least one question first."];
    return errs;
  }

  function tryExport(fn: () => void) {
    const errs = validate();
    if (errs.length) { setNotice({ type: "err", msg: errs[0] }); return; }
    setNotice(null);
    fn();
  }

  // ── Word export ───────────────────────────────────────────────

  const KATEX_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";

  function buildWordDoc(body: string): string {
    const examTypeLabel = EXAM_TYPES.find((t) => t.value === meta.examType)?.label ?? meta.examType;
    const sectionLabel = SECTIONS.find((s) => s.value === meta.section)?.label ?? meta.section;
    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link rel="stylesheet" href="${KATEX_CDN}">
<style>
  body{font-family:Arial,sans-serif;font-size:12pt;margin:40px 55px;color:#000}
  h1{font-size:15pt;text-align:center;margin-bottom:4px;font-weight:bold;letter-spacing:.5px}
  .meta{text-align:center;font-size:10pt;color:#555;margin-bottom:24px;border-bottom:1.5px solid #333;padding-bottom:12px}
  .q{margin-bottom:22px;page-break-inside:avoid}
  .stem{margin-bottom:10px;line-height:1.7;font-size:12pt}
  .opts{display:grid;grid-template-columns:1fr 1fr;gap:4px 28px;margin-left:22px}
  .opt{line-height:1.7;font-size:11pt;display:flex;gap:6px;align-items:baseline}
  .opt-lbl{font-weight:bold;min-width:20px;flex-shrink:0}
  .correct{background:#dcfce7;border-left:3px solid #16a34a;padding:2px 8px;border-radius:4px;font-weight:bold;color:#166534}
  .correct .opt-lbl{color:#166534}
  .ans-section{margin-top:36px;border-top:2px solid #000;padding-top:18px}
  .ans-section h2{font-size:12pt;margin-bottom:10px;font-weight:bold}
  .ans-grid{display:flex;flex-wrap:wrap;gap:8px;font-family:monospace;font-size:11pt}
  .ans-cell{padding:4px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-weight:bold;color:#166534}
  .katex{font-size:1em}
</style>
</head><body>
<h1>${htmlEsc(meta.title || "Examination Paper")}</h1>
<p class="meta">${htmlEsc(meta.subject || "Subject")} &bull; ${htmlEsc(meta.classLevel || "Class")} &bull; ${examTypeLabel} &bull; ${sectionLabel}</p>
${body}
</body></html>`;
  }

  function downloadStudentWord() {
    tryExport(() => {
      const filled = questions.filter((q) => q.stem.trim());
      const qHtml = filled.map((q, i) => {
        const opts = LETTERS
          .filter((l) => getOpt(q, l).trim())
          .map((l) => `<div class="opt"><span class="opt-lbl">(${l})</span><span>${renderMathHtml(getOpt(q, l))}</span></div>`)
          .join("");
        return `<div class="q"><div class="stem"><strong>${i + 1}.</strong>&nbsp;${renderMathHtml(q.stem)}</div><div class="opts">${opts}</div></div>`;
      }).join("\n");

      const blob = new Blob([buildWordDoc(qHtml)], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${meta.title || "exam"}-student-paper.doc`; a.click();
      URL.revokeObjectURL(url);
      setNotice({ type: "ok", msg: `Student paper exported — ${filled.length} questions. Math rendered via KaTeX.` });
    });
  }

  function downloadTeacherWord() {
    tryExport(() => {
      const filled = questions.filter((q) => q.stem.trim());
      const qHtml = filled.map((q, i) => {
        const opts = LETTERS
          .filter((l) => getOpt(q, l).trim())
          .map((l) => {
            const isCorrect = q.correct === l;
            return `<div class="opt${isCorrect ? " correct" : ""}"><span class="opt-lbl">(${l})</span><span>${renderMathHtml(getOpt(q, l))}</span>${isCorrect ? "&nbsp;✓" : ""}</div>`;
          }).join("");
        return `<div class="q"><div class="stem"><strong>${i + 1}.</strong>&nbsp;${renderMathHtml(q.stem)}</div><div class="opts">${opts}</div></div>`;
      }).join("\n");

      const answerKey = `<div class="ans-section"><h2>Answer Key</h2><div class="ans-grid">${
        filled.map((q, i) => `<span class="ans-cell">${i + 1}. ${q.correct}</span>`).join("")
      }</div></div>`;

      const blob = new Blob([buildWordDoc(qHtml + answerKey)], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${meta.title || "exam"}-teacher-answers.doc`; a.click();
      URL.revokeObjectURL(url);
      setNotice({ type: "ok", msg: `Teacher paper with answers exported — correct options highlighted in green.` });
    });
  }

  // ── Excel export ──────────────────────────────────────────────

  function downloadExcel() {
    tryExport(() => {
      const filled = questions.filter((q) => q.stem.trim());
      const headers = ["Question", "Option A", "Option B", "Option C", "Option D", "Option E", "Correct Answer"];
      const rows = filled.map((q, i) => [
        `${i + 1}. ${stripMath(q.stem)}`,
        stripMath(q.optA), stripMath(q.optB), stripMath(q.optC), stripMath(q.optD), stripMath(q.optE),
        q.correct, // always A/B/C/D/E
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [{ wch: 65 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Answer Key");
      XLSX.writeFile(wb, `${meta.title || "exam"}-answer-key.xlsx`);
      setNotice({ type: "ok", msg: `Answer key exported — ${filled.length} questions, Column G = correct answer letter.` });
    });
  }

  // ── Preview renderer ──────────────────────────────────────────

  function renderPreview(showAnswers: boolean) {
    const filled = questions.filter((q) => q.stem.trim());
    if (filled.length === 0) {
      return (
        <div className="text-center py-16 text-muted text-sm">
          No questions yet. Switch to the <strong>Edit</strong> tab and fill in some questions.
        </div>
      );
    }
    return (
      <div className="space-y-7">
        {/* Paper header */}
        <div className="text-center pb-5 border-b-2 border-text/20">
          <h2 className="text-lg font-bold text-text">{meta.title || "Examination Paper"}</h2>
          <p className="text-sm text-muted mt-1">
            {meta.subject || "Subject"} &bull; {meta.classLevel || "Class"} &bull;{" "}
            {EXAM_TYPES.find((t) => t.value === meta.examType)?.label} &bull;{" "}
            {SECTIONS.find((s) => s.value === meta.section)?.label}
          </p>
        </div>

        {/* Questions */}
        {filled.map((q, i) => (
          <div key={i} className="space-y-3">
            <div className="flex gap-2.5">
              <span className="font-bold text-text text-sm shrink-0">{i + 1}.</span>
              <div
                className="text-text text-sm leading-relaxed [&_.katex]{font-size:1em}"
                dangerouslySetInnerHTML={{ __html: renderMathHtml(q.stem) }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
              {LETTERS.filter((l) => getOpt(q, l).trim()).map((l) => {
                const isCorrect = showAnswers && q.correct === l;
                return (
                  <div
                    key={l}
                    className={`flex items-baseline gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      isCorrect
                        ? "bg-success/10 border-success/40 text-success font-semibold"
                        : "border-border text-text"
                    }`}
                  >
                    <span className={`font-bold shrink-0 text-xs ${isCorrect ? "text-success" : "text-text-2"}`}>
                      ({l})
                    </span>
                    <div
                      className="[&_.katex]{font-size:0.95em}"
                      dangerouslySetInnerHTML={{ __html: renderMathHtml(getOpt(q, l)) }}
                    />
                    {isCorrect && <CheckCircle size={13} className="ml-auto shrink-0 text-success" />}
                  </div>
                );
              })}
            </div>
            {showAnswers && q.correct && (
              <p className="ml-6 text-xs font-bold text-success">✓ Correct Answer: {q.correct}</p>
            )}
          </div>
        ))}

        {/* Answer key summary — teacher only */}
        {showAnswers && (
          <div className="mt-8 pt-6 border-t-2 border-border">
            <p className="text-xs font-bold text-text uppercase tracking-wider mb-3">Answer Key</p>
            <div className="flex flex-wrap gap-2">
              {filled.map((q, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-success/10 border border-success/25 rounded-lg text-success font-bold font-mono text-sm"
                >
                  {i + 1}. {q.correct}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1.5">
        {([
          { id: "edit", label: "Edit Questions", icon: Edit3 },
          { id: "student", label: "Student Preview", icon: User },
          { id: "teacher", label: "Teacher Preview", icon: GraduationCap },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === id ? "bg-primary text-white shadow-sm" : "text-text-2 hover:text-text hover:bg-bg"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── EDIT TAB ── */}
      {tab === "edit" && (
        <>
          {/* Exam metadata */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-text text-sm">Exam Details</h3>
            {exams.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Add to existing exam (optional)</label>
                <select value={examId} onChange={(e) => setExamId(e.target.value)} className={sCls}>
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
                placeholder="e.g. SS2 Mathematics 2nd Term Exam" maxLength={120} className={iCls} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-text-2 mb-1">Subject</label>
                <select value={meta.subject} onChange={(e) => setMf("subject", e.target.value)} className={sCls}>
                  <option value="">Select…</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Class</label>
                <select value={meta.classLevel} onChange={(e) => setMf("classLevel", e.target.value as ClassLevel)} className={sCls}>
                  <option value="">Select…</option>
                  {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Exam Type</label>
                <select value={meta.examType} onChange={(e) => setMf("examType", e.target.value as ExamType)} className={sCls}>
                  {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Section</label>
                <select value={meta.section} onChange={(e) => setMf("section", e.target.value as Section)} className={sCls}>
                  {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted bg-surface border border-border px-3 py-1.5 rounded-lg">
              {filledCount} of {questions.length} questions filled
            </p>
            <p className="text-xs text-muted">
              💡 Type questions using LaTeX math: <code className="bg-bg px-1 py-0.5 rounded border border-border">$y = x^2$</code> renders in preview and Word export
            </p>
          </div>

          {/* Question slots */}
          <div className="space-y-5">
            {pageQs.map((q, pageIdx) => {
              const absIdx = page * PAGE_SIZE + pageIdx;
              const qNum = absIdx + 1;
              const hasAnyOption = LETTERS.some((l) => getOpt(q, l).trim());
              return (
                <div key={absIdx} className="bg-surface border border-border rounded-xl overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 py-3 bg-bg border-b border-border flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {qNum}
                    </span>
                    <span className="text-xs font-semibold text-text-2">Question {qNum}</span>
                    {q.correct && (
                      <span className="ml-auto text-xs font-medium text-success flex items-center gap-1">
                        <CheckCircle size={11} /> Correct Answer: {q.correct}
                      </span>
                    )}
                    {!q.correct && q.stem && (
                      <span className="ml-auto text-xs text-amber-600 font-medium">⚠ No answer selected</span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Question stem */}
                    <div>
                      <label className="block text-xs font-medium text-text-2 mb-1.5">Question Text <span className="text-danger">*</span></label>
                      <textarea
                        value={q.stem}
                        onChange={(e) => setSlot(pageIdx, "stem", e.target.value)}
                        rows={2}
                        placeholder={`Type question ${qNum} here… Use $formula$ for math, e.g. $x^2 + y^2$`}
                        className={`${iCls} resize-y`}
                      />
                    </div>

                    {/* Option inputs */}
                    <div>
                      <label className="block text-xs font-medium text-text-2 mb-1.5">Answer Options</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const fk = `opt${letter}` as "optA" | "optB" | "optC" | "optD";
                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <span className="shrink-0 w-7 h-7 rounded-lg bg-bg border border-border text-xs font-bold text-text-2 flex items-center justify-center">
                                {letter}
                              </span>
                              <input
                                type="text"
                                value={q[fk]}
                                onChange={(e) => setSlot(pageIdx, fk, e.target.value)}
                                placeholder={`Option ${letter}…`}
                                className={iCls}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* Option E */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="shrink-0 w-7 h-7 rounded-lg bg-bg border border-border text-xs font-bold text-text-2 flex items-center justify-center">E</span>
                        <input
                          type="text"
                          value={q.optE}
                          onChange={(e) => setSlot(pageIdx, "optE", e.target.value)}
                          placeholder="Option E (optional)…"
                          className={iCls}
                        />
                      </div>
                    </div>

                    {/* Mark Correct Answer — prominent dedicated section */}
                    <div className="border-2 border-dashed border-amber-300/70 rounded-xl p-4 bg-amber-50/40">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={15} className="text-amber-600 shrink-0" />
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                          Mark the Correct Answer <span className="text-danger ml-0.5">*</span>
                        </p>
                      </div>

                      {hasAnyOption ? (
                        <div className="flex gap-2 flex-wrap">
                          {LETTERS.map((letter) => {
                            const optText = getOpt(q, letter).trim();
                            const isCorrect = q.correct === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                disabled={!optText}
                                title={optText ? `Mark "${optText.slice(0, 30)}" as correct` : "Fill in this option first"}
                                onClick={() => setSlot(pageIdx, "correct", isCorrect ? "" : letter)}
                                className={`min-w-[52px] px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                                  !optText
                                    ? "opacity-30 cursor-not-allowed bg-bg border-border text-muted"
                                    : isCorrect
                                      ? "bg-success text-white border-success shadow-lg scale-105 ring-2 ring-success/30"
                                      : "bg-white border-border text-text-2 hover:border-success hover:text-success hover:bg-success/5"
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">Fill in at least one option above to enable answer selection.</p>
                      )}

                      {q.correct ? (
                        <div className="flex items-center gap-2 mt-3 bg-success/10 border border-success/25 rounded-lg px-3 py-2">
                          <CheckCircle size={13} className="text-success shrink-0" />
                          <p className="text-xs font-semibold text-success">
                            Correct Answer: <strong>{q.correct}</strong>
                            {getOpt(q, q.correct as typeof LETTERS[number])
                              ? ` — ${getOpt(q, q.correct as typeof LETTERS[number]).slice(0, 50)}${getOpt(q, q.correct as typeof LETTERS[number]).length > 50 ? "…" : ""}`
                              : ""}
                          </p>
                        </div>
                      ) : q.stem ? (
                        <p className="text-xs text-amber-600 font-medium mt-2.5">
                          ⚠ No answer selected — export will be blocked until you mark the correct answer.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-border text-text-2 hover:border-primary/40 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Previous 5
            </button>
            <span className="text-xs text-muted">
              Page {page + 1} of {totalPages} &bull; Q{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, questions.length)}
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
        </>
      )}

      {/* ── PREVIEW TABS ── */}
      {(tab === "student" || tab === "teacher") && (
        <div className="bg-surface border border-border rounded-xl p-6">
          {/* Preview header */}
          <div className={`flex items-center gap-2 mb-5 pb-4 border-b border-border`}>
            {tab === "student" ? (
              <>
                <User size={15} className="text-primary" />
                <span className="font-semibold text-sm text-text">Student Preview</span>
                <span className="ml-auto text-xs px-2.5 py-1 bg-bg border border-border rounded-lg text-muted">
                  Answers hidden — student view
                </span>
              </>
            ) : (
              <>
                <GraduationCap size={15} className="text-primary" />
                <span className="font-semibold text-sm text-text">Teacher Preview</span>
                <span className="ml-auto text-xs px-2.5 py-1 bg-success/10 border border-success/25 rounded-lg text-success font-medium">
                  ✓ Correct answers highlighted
                </span>
              </>
            )}
          </div>
          {renderPreview(tab === "teacher")}
        </div>
      )}

      {/* ── EXPORT SECTION (always visible) ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-text text-sm mb-1">Export Question Paper</h3>
        <p className="text-xs text-muted mb-4">
          {filledCount} question{filledCount !== 1 ? "s" : ""} ready &bull; Math expressions render automatically in Word exports via KaTeX
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadStudentWord}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <FileText size={15} /> Export Student Paper (Word)
          </button>
          <button
            onClick={downloadTeacherWord}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          >
            <FileText size={15} /> Export Teacher Paper + Answers (Word)
          </button>
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <FileSpreadsheet size={15} /> Excel Answer Key / Gradebook
          </button>
        </div>

        <p className="text-xs text-muted mt-3">
          <strong>Word</strong> — print-ready exam paper with rendered math.&nbsp;
          <strong>Excel</strong> — plain text: col A = Question, B–F = Options, G = Correct Answer letter (A/B/C/D/E).
        </p>

        {notice && (
          <div className={`flex items-start gap-2 text-sm mt-4 p-3 rounded-lg border ${
            notice.type === "ok"
              ? "text-success bg-success/5 border-success/20"
              : "text-danger bg-danger/5 border-danger/20"
          }`}>
            {notice.type === "ok"
              ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
              : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
            <span>{notice.msg}</span>
          </div>
        )}
      </div>

    </div>
  );
}
