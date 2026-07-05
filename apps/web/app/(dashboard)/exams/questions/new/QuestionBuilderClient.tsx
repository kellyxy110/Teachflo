"use client";

import { useState } from "react";
import katex from "katex";
import * as XLSX from "xlsx";
import {
  Edit3, Eye, Download, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, Plus, User, GraduationCap,
  FileText, FileSpreadsheet,
} from "lucide-react";
import type { ClassLevel, ExamType, Section } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const PAGE_SIZE = 5;

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
  { value: "A", label: "Section A — Objectives (MCQ)" },
  { value: "B", label: "Section B — Theory" },
  { value: "C", label: "Section C — Advanced" },
];

// ── Types ─────────────────────────────────────────────────────────

type CorrectLetter = "A" | "B" | "C" | "D" | "E" | "";
type Tab = "build" | "preview" | "export";
type PreviewMode = "student" | "teacher";

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

const emptySlot = (): QuestionSlot => ({
  stem: "", optA: "", optB: "", optC: "", optD: "", optE: "", correct: "",
});
const initialMeta = (): Meta => ({
  title: "", subject: "", classLevel: "", examType: "SCHOOL_EXAM", section: "A",
});

// ── Math helpers ──────────────────────────────────────────────────

function htmlEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

function stripMath(raw: string): string {
  return raw.replace(/\$\$?([^$]+?)\$\$?/g, (_, tex) => tex.trim()).trim();
}

function getOpt(q: QuestionSlot, l: typeof LETTERS[number]): string {
  return ({ A: q.optA, B: q.optB, C: q.optC, D: q.optD, E: q.optE })[l];
}

// ── Styles ────────────────────────────────────────────────────────

const iCls = "w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const sCls = "w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

// ── Shared: Notice banner ─────────────────────────────────────────

function Notice({ type, msg }: { type: "ok" | "err"; msg: string }) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
      type === "ok"
        ? "bg-success/5 border-success/20 text-success"
        : "bg-danger/5 border-danger/20 text-danger"
    }`}>
      {type === "ok"
        ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
        : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
      <span>{msg}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function QuestionBuilderClient({ exams }: { exams: ExamOption[] }) {
  const [meta, setMeta] = useState<Meta>(initialMeta());
  const [questions, setQuestions] = useState<QuestionSlot[]>(
    Array.from({ length: PAGE_SIZE }, emptySlot)
  );
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<Tab>("build");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("student");
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [examId, setExamId] = useState("");

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageQs = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const filledQuestions = questions.filter((q) => q.stem.trim());
  const filledCount = filledQuestions.length;

  function setMf<K extends keyof Meta>(k: K, v: Meta[K]) {
    setMeta((m) => ({ ...m, [k]: v }));
  }

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

  function validate(): string | null {
    if (filledCount === 0) return "No questions to export. Fill in at least one question first.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.stem.trim()) continue;
      if (!q.correct) {
        return `Question ${i + 1} has no correct answer selected. Please mark the correct answer before exporting.`;
      }
    }
    return null;
  }

  function tryExport(fn: () => void) {
    const err = validate();
    if (err) { setNotice({ type: "err", msg: err }); return; }
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

  function exportStudentWord() {
    tryExport(() => {
      const qHtml = filledQuestions.map((q, i) => {
        const opts = LETTERS
          .filter((l) => getOpt(q, l).trim())
          .map((l) => `<div class="opt"><span class="opt-lbl">(${l})</span><span>${renderMathHtml(getOpt(q, l))}</span></div>`)
          .join("");
        return `<div class="q"><div class="stem"><strong>${i + 1}.</strong>&nbsp;${renderMathHtml(q.stem)}</div><div class="opts">${opts}</div></div>`;
      }).join("\n");

      const blob = new Blob([buildWordDoc(qHtml)], { type: "application/msword" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${meta.title || "exam"}-student-paper.doc`;
      a.click();
      URL.revokeObjectURL(a.href);
      setNotice({ type: "ok", msg: `Student paper exported — ${filledCount} questions. Math rendered via KaTeX. Open with Microsoft Word or LibreOffice.` });
    });
  }

  function exportTeacherWord() {
    tryExport(() => {
      const qHtml = filledQuestions.map((q, i) => {
        const opts = LETTERS
          .filter((l) => getOpt(q, l).trim())
          .map((l) => {
            const isCorrect = q.correct === l;
            return `<div class="opt${isCorrect ? " correct" : ""}"><span class="opt-lbl">(${l})</span><span>${renderMathHtml(getOpt(q, l))}</span>${isCorrect ? "&nbsp;✓" : ""}</div>`;
          }).join("");
        return `<div class="q"><div class="stem"><strong>${i + 1}.</strong>&nbsp;${renderMathHtml(q.stem)}</div><div class="opts">${opts}</div></div>`;
      }).join("\n");

      const answerKey = `<div class="ans-section"><h2>Answer Key</h2><div class="ans-grid">${
        filledQuestions.map((q, i) => `<span class="ans-cell">${i + 1}. ${q.correct}</span>`).join("")
      }</div></div>`;

      const blob = new Blob([buildWordDoc(qHtml + answerKey)], { type: "application/msword" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${meta.title || "exam"}-teacher-answers.doc`;
      a.click();
      URL.revokeObjectURL(a.href);
      setNotice({ type: "ok", msg: `Teacher paper exported — correct answers highlighted green. Answer key included at end.` });
    });
  }

  function exportExcel() {
    tryExport(() => {
      // Column headers exactly A–G
      const headers = [
        "Column A: Question",
        "Column B: Option A",
        "Column C: Option B",
        "Column D: Option C",
        "Column E: Option D",
        "Column F: Option E",
        "Column G: Correct Answer (A/B/C/D/E)",
      ];
      const rows = filledQuestions.map((q, i) => [
        `${i + 1}. ${stripMath(q.stem)}`,
        stripMath(q.optA),
        stripMath(q.optB),
        stripMath(q.optC),
        stripMath(q.optD),
        stripMath(q.optE),
        q.correct,  // ← Column G: always A, B, C, D, or E
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [
        { wch: 65 }, // A - Question
        { wch: 28 }, // B - Opt A
        { wch: 28 }, // C - Opt B
        { wch: 28 }, // D - Opt C
        { wch: 28 }, // E - Opt D
        { wch: 28 }, // F - Opt E
        { wch: 22 }, // G - Correct Answer
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exam Answer Key");
      XLSX.writeFile(wb, `${meta.title || "exam"}-answer-key.xlsx`);
      setNotice({ type: "ok", msg: `Excel exported — ${filledCount} questions. Column G contains the correct answer letter (A/B/C/D/E).` });
    });
  }

  // ── Preview renderer ──────────────────────────────────────────

  function renderPreview() {
    if (filledCount === 0) {
      return (
        <div className="text-center py-20 text-muted text-sm">
          No questions yet — go to <strong>Build Questions</strong> and fill in at least one question.
        </div>
      );
    }
    const showAnswers = previewMode === "teacher";
    return (
      <div className="space-y-7">
        {/* Paper header */}
        <div className="text-center pb-5 border-b-2 border-text/20">
          <h2 className="text-lg font-bold text-text">{meta.title || "Examination Paper"}</h2>
          <p className="text-sm text-muted mt-1">
            {[
              meta.subject || "Subject",
              meta.classLevel || "Class",
              EXAM_TYPES.find((t) => t.value === meta.examType)?.label,
              SECTIONS.find((s) => s.value === meta.section)?.label,
            ].filter(Boolean).join(" • ")}
          </p>
        </div>

        {/* Questions */}
        {filledQuestions.map((q, i) => (
          <div key={i} className="space-y-3">
            <div className="flex gap-2.5">
              <span className="font-bold text-text text-sm shrink-0 mt-0.5">{i + 1}.</span>
              <div
                className="text-text text-sm leading-relaxed flex-1"
                dangerouslySetInnerHTML={{ __html: renderMathHtml(q.stem) }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
              {LETTERS.filter((l) => getOpt(q, l).trim()).map((l) => {
                const isCorrect = showAnswers && q.correct === l;
                return (
                  <div
                    key={l}
                    className={`flex items-baseline gap-2 px-3 py-2 rounded-lg text-sm border ${
                      isCorrect
                        ? "bg-success/10 border-success/40 text-success font-semibold"
                        : "border-border text-text"
                    }`}
                  >
                    <span className={`font-bold shrink-0 text-xs ${isCorrect ? "text-success" : "text-text-2"}`}>
                      ({l})
                    </span>
                    <div
                      className="flex-1"
                      dangerouslySetInnerHTML={{ __html: renderMathHtml(getOpt(q, l)) }}
                    />
                    {isCorrect && <CheckCircle size={13} className="ml-auto shrink-0 text-success" />}
                  </div>
                );
              })}
            </div>
            {showAnswers && q.correct && (
              <p className="ml-6 text-xs font-bold text-success bg-success/5 border border-success/20 px-3 py-1.5 rounded-lg inline-block">
                ✓ Correct Answer: {q.correct}
              </p>
            )}
          </div>
        ))}

        {/* Answer key summary — teacher only */}
        {showAnswers && (
          <div className="mt-8 pt-6 border-t-2 border-border">
            <p className="text-xs font-bold text-text uppercase tracking-wider mb-3">Answer Key</p>
            <div className="flex flex-wrap gap-2">
              {filledQuestions.map((q, i) => (
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
    <div className="space-y-5 max-w-5xl">

      {/* ── Main tab bar ── */}
      <div className="flex items-center bg-surface border border-border rounded-xl p-1.5 gap-1">
        {([
          { id: "build",   label: "Build Questions", icon: Edit3 },
          { id: "preview", label: "Preview",          icon: Eye },
          { id: "export",  label: "Export",           icon: Download },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:text-text hover:bg-bg"
            }`}
          >
            <Icon size={15} /> {label}
            {id === "build" && filledCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                tab === "build" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
              }`}>
                {filledCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── BUILD TAB ── */}
      {tab === "build" && (
        <>
          {/* Exam metadata */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-text text-sm">Exam Details</h3>
            {exams.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Add to existing exam (optional)</label>
                <select value={examId} onChange={(e) => setExamId(e.target.value)} className={sCls}>
                  <option value="">— create new exam —</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex._count.questions} questions)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Exam Title</label>
              <input
                type="text"
                value={meta.title}
                onChange={(e) => setMf("title", e.target.value)}
                placeholder="e.g. SS2 Mathematics 2nd Term Exam"
                maxLength={120}
                className={iCls}
              />
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
                <select
                  value={meta.classLevel}
                  onChange={(e) => setMf("classLevel", e.target.value as ClassLevel)}
                  className={sCls}
                >
                  <option value="">Select…</option>
                  {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Exam Type</label>
                <select
                  value={meta.examType}
                  onChange={(e) => setMf("examType", e.target.value as ExamType)}
                  className={sCls}
                >
                  {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Section</label>
                <select
                  value={meta.section}
                  onChange={(e) => setMf("section", e.target.value as Section)}
                  className={sCls}
                >
                  {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Math hint */}
          <div className="flex items-center gap-2 text-xs text-muted bg-surface border border-border rounded-lg px-4 py-2.5">
            <span className="text-base">📐</span>
            <span>
              Type LaTeX math using dollar signs: <code className="bg-bg border border-border px-1.5 py-0.5 rounded font-mono">$y = x^2$</code> →&nbsp;
              <span dangerouslySetInnerHTML={{ __html: (() => { try { return katex.renderToString("y = x^2", { throwOnError: false }); } catch { return "y = x²"; } })() }} />
              &nbsp; · &nbsp;
              <code className="bg-bg border border-border px-1.5 py-0.5 rounded font-mono">$$E = mc^2$$</code> for display math
            </span>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted font-medium">
              {filledCount > 0 ? (
                <span className="text-success font-semibold">{filledCount} question{filledCount !== 1 ? "s" : ""} ready</span>
              ) : (
                "0 questions — fill in question text below to start"
              )}
              {" · "}{questions.length} slots total
            </p>
            <p className="text-xs text-muted">
              Page {page + 1} of {totalPages} &bull; Q{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, questions.length)}
            </p>
          </div>

          {/* Question slots */}
          <div className="space-y-5">
            {pageQs.map((q, pageIdx) => {
              const absIdx = page * PAGE_SIZE + pageIdx;
              const qNum = absIdx + 1;
              const hasAnyOption = LETTERS.some((l) => getOpt(q, l).trim());

              return (
                <div
                  key={absIdx}
                  className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
                    q.stem && !q.correct
                      ? "border-amber-300"
                      : q.correct
                        ? "border-success/40"
                        : "border-border"
                  }`}
                >
                  {/* Card header */}
                  <div className="px-4 py-3 bg-bg border-b border-border flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {qNum}
                    </span>
                    <span className="text-xs font-semibold text-text-2">Question {qNum}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {q.correct && (
                        <span className="text-xs font-bold text-success flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded-full border border-success/25">
                          <CheckCircle size={11} /> Correct: {q.correct}
                        </span>
                      )}
                      {!q.correct && q.stem && (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ⚠ No answer selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Stem */}
                    <div>
                      <label className="block text-xs font-semibold text-text-2 mb-1.5">
                        Question Text <span className="text-danger font-bold">*</span>
                      </label>
                      <textarea
                        value={q.stem}
                        onChange={(e) => setSlot(pageIdx, "stem", e.target.value)}
                        rows={2}
                        placeholder={`Type question ${qNum} here… e.g. Differentiate $y = x^x$ with respect to $x$.`}
                        className={`${iCls} resize-y`}
                      />
                    </div>

                    {/* Options */}
                    <div>
                      <label className="block text-xs font-semibold text-text-2 mb-2">
                        Answer Options
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const fk = `opt${letter}` as "optA" | "optB" | "optC" | "optD";
                          const isCorrect = q.correct === letter;
                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors ${
                                isCorrect
                                  ? "bg-success text-white border-success"
                                  : "bg-bg border-border text-text-2"
                              }`}>
                                {letter}
                              </span>
                              <input
                                type="text"
                                value={q[fk]}
                                onChange={(e) => setSlot(pageIdx, fk, e.target.value)}
                                placeholder={`Option ${letter}…`}
                                className={`${iCls} ${isCorrect ? "border-success/40 ring-1 ring-success/20" : ""}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors ${
                          q.correct === "E"
                            ? "bg-success text-white border-success"
                            : "bg-bg border-border text-text-2"
                        }`}>E</span>
                        <input
                          type="text"
                          value={q.optE}
                          onChange={(e) => setSlot(pageIdx, "optE", e.target.value)}
                          placeholder="Option E (optional)…"
                          className={`${iCls} ${q.correct === "E" ? "border-success/40 ring-1 ring-success/20" : ""}`}
                        />
                      </div>
                    </div>

                    {/* ── CORRECT ANSWER SELECTOR ── */}
                    <div className="border-2 border-primary/20 bg-primary/3 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={15} className="text-primary shrink-0" />
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">
                          Mark the Correct Answer <span className="text-danger">*</span>
                        </p>
                        <span className="text-xs text-muted font-normal normal-case">— click the letter button that matches the correct option</span>
                      </div>

                      {hasAnyOption ? (
                        <div className="flex gap-3 flex-wrap">
                          {LETTERS.map((letter) => {
                            const optText = getOpt(q, letter).trim();
                            const isCorrect = q.correct === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                disabled={!optText}
                                onClick={() => setSlot(pageIdx, "correct", isCorrect ? "" : letter)}
                                title={optText ? `Mark Option ${letter}: "${optText.slice(0, 40)}" as correct` : `Fill in Option ${letter} first`}
                                className={`min-w-[56px] px-5 py-3 rounded-xl text-base font-black border-2 transition-all ${
                                  !optText
                                    ? "opacity-25 cursor-not-allowed bg-bg border-border text-muted"
                                    : isCorrect
                                      ? "bg-success text-white border-success shadow-lg scale-110 ring-4 ring-success/20"
                                      : "bg-white border-border text-text-2 hover:border-success hover:text-success hover:bg-success/5 dark:bg-surface"
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">
                          Fill in at least one option (A, B, C, D, or E) above first, then click the correct letter here.
                        </p>
                      )}

                      {q.correct ? (
                        <div className="flex items-center gap-2 mt-3 bg-success/10 border border-success/30 rounded-lg px-3 py-2.5">
                          <CheckCircle size={14} className="text-success shrink-0" />
                          <p className="text-sm font-bold text-success">
                            Correct Answer: <span className="text-lg">{q.correct}</span>
                            {getOpt(q, q.correct as typeof LETTERS[number]) ? (
                              <span className="font-normal text-success/80 ml-1">
                                — {getOpt(q, q.correct as typeof LETTERS[number]).slice(0, 60)}
                                {getOpt(q, q.correct as typeof LETTERS[number]).length > 60 ? "…" : ""}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      ) : q.stem ? (
                        <p className="text-xs text-amber-600 font-medium mt-3 flex items-center gap-1.5">
                          <AlertCircle size={12} className="shrink-0" />
                          No answer selected — export will be blocked until you click the correct letter above.
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
              <ChevronLeft size={14} /> Prev 5
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all ${
                    i === page
                      ? "bg-primary text-white border-primary"
                      : "border-border text-text-2 hover:border-primary/40"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

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
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors font-medium"
              >
                <Plus size={14} /> Add 5 more questions
              </button>
            )}
          </div>

          {/* Quick export shortcut from build tab */}
          {filledCount > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-muted">
                <span className="font-semibold text-text">{filledCount} question{filledCount !== 1 ? "s" : ""} filled.</span>{" "}
                Switch to <strong>Preview</strong> to see how the exam looks, or <strong>Export</strong> to download.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setTab("preview")} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-bg border border-border text-text-2 hover:text-text transition-colors">
                  <Eye size={13} /> Preview
                </button>
                <button onClick={() => setTab("export")} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                  <Download size={13} /> Export
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PREVIEW TAB ── */}
      {tab === "preview" && (
        <div className="space-y-4">
          {/* Student / Teacher toggle */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-text-2 mb-3 uppercase tracking-wide">Preview Mode</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode("student")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  previewMode === "student"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "border-border text-text-2 hover:border-primary/40 bg-bg"
                }`}
              >
                <User size={14} /> Student Preview
                <span className="text-xs font-normal opacity-70">(answers hidden)</span>
              </button>
              <button
                onClick={() => setPreviewMode("teacher")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  previewMode === "teacher"
                    ? "bg-success text-white border-success shadow-sm"
                    : "border-border text-text-2 hover:border-success/40 bg-bg"
                }`}
              >
                <GraduationCap size={14} /> Teacher Preview
                <span className="text-xs font-normal opacity-70">(answers shown)</span>
              </button>
            </div>
          </div>

          {/* Preview body */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
              {previewMode === "student" ? (
                <>
                  <User size={14} className="text-primary" />
                  <span className="font-semibold text-sm text-text">Student View — Answers Hidden</span>
                </>
              ) : (
                <>
                  <GraduationCap size={14} className="text-success" />
                  <span className="font-semibold text-sm text-text">Teacher View — Correct Answers Highlighted</span>
                </>
              )}
            </div>
            {renderPreview()}
          </div>
        </div>
      )}

      {/* ── EXPORT TAB ── */}
      {tab === "export" && (
        <div className="space-y-4">

          {/* Export status */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            filledCount === 0
              ? "bg-amber-50/40 border-amber-200 text-amber-700"
              : validate()
                ? "bg-amber-50/40 border-amber-200 text-amber-700"
                : "bg-success/5 border-success/25 text-success"
          }`}>
            {filledCount === 0 || validate() ? (
              <AlertCircle size={16} className="shrink-0" />
            ) : (
              <CheckCircle size={16} className="shrink-0" />
            )}
            <span className="text-sm font-medium">
              {filledCount === 0
                ? "No questions yet. Go to Build Questions and fill in your exam."
                : validate() ?? `${filledCount} question${filledCount !== 1 ? "s" : ""} ready to export.`}
            </span>
          </div>

          {/* Excel export — Column map preview */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FileSpreadsheet size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-text">Excel Answer Key / Gradebook Export</h3>
                <p className="text-xs text-muted mt-0.5">Plain text data for gradebooks, CBT import, or marking</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Column map table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-bg">
                      <th className="text-left px-3 py-2 border border-border font-bold text-text-2">Column</th>
                      <th className="text-left px-3 py-2 border border-border font-bold text-text-2">What it contains</th>
                      <th className="text-left px-3 py-2 border border-border font-bold text-text-2">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["A", "Question text (numbered)", "1. Differentiate y = x^x…"],
                      ["B", "Option A text", "x^x(ln x + 1)"],
                      ["C", "Option B text", "x^x ln x"],
                      ["D", "Option C text", "x^(x-1)"],
                      ["E", "Option D text", "x^x + 1"],
                      ["F", "Option E text (if used)", "x^x(ln x)"],
                      ["G", "✅ Correct Answer — A, B, C, D, or E", "A"],
                    ].map(([col, desc, example]) => (
                      <tr key={col} className={col === "G" ? "bg-success/5" : ""}>
                        <td className={`px-3 py-2 border border-border font-mono font-bold ${col === "G" ? "text-success" : "text-text"}`}>
                          {col}
                        </td>
                        <td className={`px-3 py-2 border border-border ${col === "G" ? "text-success font-semibold" : "text-text-2"}`}>
                          {desc}
                        </td>
                        <td className="px-3 py-2 border border-border text-muted font-mono">
                          {example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <FileSpreadsheet size={15} /> Export Excel Answer Key / Gradebook
              </button>
            </div>
          </div>

          {/* Word exports */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-text">Word Document Export</h3>
                <p className="text-xs text-muted mt-0.5">Print-ready exam papers — math rendered via KaTeX, no raw LaTeX in output</p>
              </div>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-primary" />
                  <span className="font-semibold text-sm text-text">Student Paper</span>
                </div>
                <ul className="text-xs text-text-2 space-y-1.5">
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> All questions with options A–E</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> Math rendered — no raw $formula$</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" /> Correct answers hidden</li>
                </ul>
                <button
                  onClick={exportStudentWord}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <FileText size={14} /> Export Student Paper
                </button>
              </div>

              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-purple-600" />
                  <span className="font-semibold text-sm text-text">Teacher Paper + Answers</span>
                </div>
                <ul className="text-xs text-text-2 space-y-1.5">
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" /> All questions with options A–E</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" /> Math rendered — no raw $formula$</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Correct option highlighted green ✓</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Answer key table at end</li>
                </ul>
                <button
                  onClick={exportTeacherWord}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  <FileText size={14} /> Export Teacher Paper + Answers
                </button>
              </div>
            </div>
          </div>

          {notice && <Notice type={notice.type} msg={notice.msg} />}
        </div>
      )}

      {/* Global notice (outside export tab) */}
      {notice && tab !== "export" && (
        <Notice type={notice.type} msg={notice.msg} />
      )}

    </div>
  );
}
