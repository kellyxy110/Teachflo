"use client";

import { useRef, useState, type ElementType } from "react";
import katex from "katex";
import * as XLSX from "xlsx";
import {
  Edit3, Eye, Download, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, Plus, User, GraduationCap,
  FileText, FileSpreadsheet, BookOpen, Hash, BarChart2, Lightbulb, X,
  HelpCircle, ChevronDown,
} from "lucide-react";
import { GenerateVisualButton } from "@/components/media/GenerateVisualButton";
import type { ClassLevel, ExamType, Section } from "@prisma/client";
import { KaTeXPreview, LaTeXToolbar } from "@/components/exam/KaTeXPreview";

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
const DIFFICULTIES = ["", "Basic", "Application", "WAEC", "JAMB", "JUPEB"] as const;

// ── Types ─────────────────────────────────────────────────────────

type CorrectLetter = "A" | "B" | "C" | "D" | "E" | "";
type Tab = "build" | "preview" | "export";
type PreviewMode = "student" | "teacher";

interface QuestionSlot {
  stem: string;
  optA: string; optB: string; optC: string; optD: string; optE: string;
  correct: CorrectLetter;
  marks: number;
  difficulty: string;
  topic: string;
  explanation: string;
  diagramUrl?: string;
}
interface Meta {
  title: string; subject: string; classLevel: string;
  examType: ExamType; section: Section;
}
type ExamOption = {
  id: string; title: string; subject: string; topic: string;
  classLevel: string; _count: { questions: number };
};
type NoticeData = { type: "ok" | "err"; msgs: string[] };

const emptySlot = (): QuestionSlot => ({
  stem: "", optA: "", optB: "", optC: "", optD: "", optE: "", correct: "",
  marks: 1, difficulty: "", topic: "", explanation: "",
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

// MathML variant for Word export — Word renders MathML natively via its own equation
// engine (Cambria Math). This avoids the KaTeX CDN CSS/font dependency that Word blocks.
function renderMathMML(raw: string): string {
  const parts = raw.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return parts.map((part) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const tex = part.slice(2, -2).trim();
      try { return katex.renderToString(tex, { displayMode: true, throwOnError: false, output: "mathml" }); }
      catch { return htmlEsc(part); }
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      const tex = part.slice(1, -1).trim();
      try { return katex.renderToString(tex, { throwOnError: false, output: "mathml" }); }
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

// ── Notice component ──────────────────────────────────────────────

function Notice({ type, msgs }: { type: "ok" | "err"; msgs: string[] }) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
      type === "ok"
        ? "bg-success/5 border-success/20 text-success"
        : "bg-danger/5 border-danger/20 text-danger"
    }`}>
      {type === "ok"
        ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
        : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
      <div className="space-y-0.5">
        {msgs.map((m, i) => <p key={i}>{m}</p>)}
      </div>
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
  const [notice, setNotice] = useState<NoticeData | null>(null);
  const [examId, setExamId] = useState("");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // key = `${absIdx}:${fieldName}` — used for cursor-aware LaTeX insertion
  const fieldRefs = useRef<Map<string, HTMLTextAreaElement | HTMLInputElement>>(new Map());

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageQs = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const filledQuestions = questions.filter((q) => q.stem.trim());
  const filledCount = filledQuestions.length;

  function setMf<K extends keyof Meta>(k: K, v: Meta[K]) {
    setMeta((m) => ({ ...m, [k]: v }));
  }

  function setSlot(pageIdx: number, field: keyof QuestionSlot, value: string | number | undefined) {
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

  function setFieldRef(key: string, el: HTMLTextAreaElement | HTMLInputElement | null) {
    if (el) fieldRefs.current.set(key, el);
    else fieldRefs.current.delete(key);
  }

  // Returns an onInsert handler scoped to a single question card.
  // Inserts LaTeX at the cursor position of the last focused field within that card.
  // Falls back to the stem if no field in the card has been focused yet.
  function makeInsertHandler(cardAbsIdx: number) {
    return (latex: string) => {
      const key = (focusedKey && focusedKey.startsWith(`${cardAbsIdx}:`))
        ? focusedKey
        : `${cardAbsIdx}:stem`;
      const el = fieldRefs.current.get(key);
      if (!el) return;
      const fieldName = key.slice(key.indexOf(":") + 1) as keyof QuestionSlot;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const newVal = el.value.slice(0, start) + latex + el.value.slice(end);
      setQuestions((qs) => {
        const next = [...qs];
        next[cardAbsIdx] = { ...next[cardAbsIdx], [fieldName]: newVal };
        return next;
      });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + latex.length, start + latex.length);
      });
    };
  }

  function getFocusedFieldLabel(absIdx: number): string | null {
    if (!focusedKey || !focusedKey.startsWith(`${absIdx}:`)) return null;
    const field = focusedKey.slice(focusedKey.indexOf(":") + 1);
    const labels: Record<string, string> = {
      stem: "Question text",
      optA: "Option A", optB: "Option B", optC: "Option C", optD: "Option D", optE: "Option E",
      explanation: "Explanation",
    };
    return labels[field] ?? null;
  }

  // ── Validation — collects ALL errors ──────────────────────────

  function validate(): string[] {
    const errs: string[] = [];
    if (filledCount === 0) {
      errs.push("No questions filled in. Add at least one question before exporting.");
      return errs;
    }
    questions.forEach((q, i) => {
      if (!q.stem.trim()) return;
      if (!q.correct) {
        errs.push(`Q${i + 1}: No correct answer selected. Click the correct letter (A–E) to mark it.`);
      }
    });
    return errs;
  }

  function tryExport(fn: () => void) {
    const errs = validate();
    if (errs.length > 0) { setNotice({ type: "err", msgs: errs }); return; }
    setNotice(null);
    fn();
  }

  // ── Word export ───────────────────────────────────────────────

  // Math is rendered as MathML so no external CSS is needed — Word uses its own engine.

  function buildWordDoc(body: string, isTeacher: boolean): string {
    const examTypeLabel = EXAM_TYPES.find((t) => t.value === meta.examType)?.label ?? meta.examType;
    const sectionLabel = SECTIONS.find((s) => s.value === meta.section)?.label ?? meta.section;
    const totalMarks = isTeacher
      ? filledQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)
      : null;

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  @page { margin: 2.5cm 2.8cm; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    color: #000;
    line-height: 1.6;
    margin: 40px 55px;
  }
  .exam-title {
    font-size: 14pt;
    text-align: center;
    font-weight: bold;
    margin: 0 0 4px;
    letter-spacing: 0.3px;
  }
  .exam-meta {
    text-align: center;
    font-size: 10.5pt;
    color: #333;
    margin: 0 0 4px;
  }
  .exam-marks {
    text-align: center;
    font-size: 10pt;
    color: #555;
    font-style: italic;
    margin: 0 0 10px;
  }
  .header-rule {
    border: none;
    border-top: 2px solid #000;
    margin: 0 0 22px;
  }
  .q {
    margin-bottom: 22px;
    page-break-inside: avoid;
  }
  .q-header {
    display: flex;
    align-items: baseline;
    gap: 8pt;
    margin-bottom: 5px;
  }
  .q-num {
    font-weight: bold;
    font-size: 12pt;
    min-width: 22pt;
    flex-shrink: 0;
  }
  .q-meta-badge {
    font-size: 9pt;
    color: #666;
    font-style: italic;
  }
  .stem {
    font-size: 12pt;
    line-height: 1.7;
    margin-left: 22pt;
    margin-bottom: 8px;
  }
  .opts {
    margin-left: 40pt;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3pt 24pt;
  }
  .opt {
    display: flex;
    gap: 6pt;
    align-items: baseline;
    font-size: 11pt;
    line-height: 1.6;
  }
  .opt-lbl {
    font-weight: bold;
    min-width: 16pt;
    flex-shrink: 0;
  }
  .correct {
    background: #dcfce7;
    border-left: 3px solid #16a34a;
    padding: 1pt 6pt;
    border-radius: 3px;
    font-weight: bold;
    color: #166534;
  }
  .correct .opt-lbl { color: #166534; }
  .correct .opt-lbl::after { content: " ✓"; }
  .explanation {
    margin: 6pt 0 0 40pt;
    font-size: 10pt;
    font-style: italic;
    color: #374151;
    border-left: 2pt solid #9ca3af;
    padding: 3pt 0 3pt 8pt;
  }
  .explanation-label {
    font-weight: bold;
    font-style: normal;
    color: #111;
  }
  .ans-section {
    margin-top: 32pt;
    border-top: 2pt solid #000;
    padding-top: 14pt;
  }
  .ans-section h2 {
    font-size: 11pt;
    font-weight: bold;
    margin: 0 0 10pt;
  }
  .ans-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 5pt;
    font-family: 'Courier New', monospace;
    font-size: 10.5pt;
  }
  .ans-cell {
    padding: 2pt 10pt;
    background: #f0fdf4;
    border: 0.5pt solid #86efac;
    font-weight: bold;
    color: #166534;
    border-radius: 3px;
  }
  .katex { font-size: 1em; }
  .katex-display { margin: 4pt 0; }
  @media print {
    body { margin: 0; }
    .q { page-break-inside: avoid; }
  }
</style>
</head><body>
<h1 class="exam-title">${htmlEsc(meta.title || "Examination Paper")}</h1>
<p class="exam-meta">${htmlEsc(meta.subject || "Subject")} &bull; ${htmlEsc(meta.classLevel || "Class")} &bull; ${examTypeLabel} &bull; ${sectionLabel}</p>
${totalMarks !== null ? `<p class="exam-marks">Total Marks: ${totalMarks}</p>` : ""}
<hr class="header-rule">
${body}
</body></html>`;
  }

  function exportStudentWord() {
    tryExport(() => {
      const qHtml = filledQuestions.map((q, i) => {
        const marksLabel = q.marks > 1 ? `${q.marks} marks` : "1 mark";
        const opts = LETTERS
          .filter((l) => getOpt(q, l).trim())
          .map((l) => `<div class="opt"><span class="opt-lbl">(${l})</span><span>${renderMathMML(getOpt(q, l))}</span></div>`)
          .join("");
        return `<div class="q">
  <div class="q-header">
    <span class="q-num">${i + 1}.</span>
    <span class="q-meta-badge">[${marksLabel}]</span>
  </div>
  <div class="stem">${renderMathMML(q.stem)}</div>
  <div class="opts">${opts}</div>
</div>`;
      }).join("\n");

      const blob = new Blob([buildWordDoc(qHtml, false)], { type: "application/msword" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${meta.title || "exam"}-student-paper.doc`;
      a.click();
      URL.revokeObjectURL(a.href);
      setNotice({ type: "ok", msgs: [`Student paper exported — ${filledCount} questions. Math rendered via KaTeX. Open with Microsoft Word or LibreOffice.`] });
    });
  }

  function exportTeacherWord() {
    tryExport(() => {
      const qHtml = filledQuestions.map((q, i) => {
        const marksLabel = q.marks > 1 ? `${q.marks} marks` : "1 mark";
        const diffBadge = q.difficulty ? ` · ${q.difficulty}` : "";
        const topicBadge = q.topic ? ` · ${q.topic}` : "";
        const opts = LETTERS
          .filter((l) => getOpt(q, l).trim())
          .map((l) => {
            const isCorrect = q.correct === l;
            return `<div class="opt${isCorrect ? " correct" : ""}"><span class="opt-lbl">(${l})</span><span>${renderMathMML(getOpt(q, l))}</span></div>`;
          }).join("");
        const explanationHtml = q.explanation.trim()
          ? `<div class="explanation"><span class="explanation-label">Marking Guide:</span> ${htmlEsc(q.explanation)}</div>`
          : "";
        return `<div class="q">
  <div class="q-header">
    <span class="q-num">${i + 1}.</span>
    <span class="q-meta-badge">[${marksLabel}${diffBadge}${topicBadge}]</span>
  </div>
  <div class="stem">${renderMathMML(q.stem)}</div>
  <div class="opts">${opts}</div>
  ${explanationHtml}
</div>`;
      }).join("\n");

      const answerKey = `<div class="ans-section"><h2>Answer Key</h2><div class="ans-grid">${
        filledQuestions.map((q, i) => `<span class="ans-cell">${i + 1}. ${q.correct}</span>`).join("")
      }</div></div>`;

      const blob = new Blob([buildWordDoc(qHtml + answerKey, true)], { type: "application/msword" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${meta.title || "exam"}-teacher-answers.doc`;
      a.click();
      URL.revokeObjectURL(a.href);
      setNotice({ type: "ok", msgs: [`Teacher paper exported — correct answers highlighted green. Answer key and marking guides included.`] });
    });
  }

  function exportExcel() {
    tryExport(() => {
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
        q.correct,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [
        { wch: 65 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 22 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exam Answer Key");
      XLSX.writeFile(wb, `${meta.title || "exam"}-answer-key.xlsx`);
      setNotice({ type: "ok", msgs: [`Excel exported — ${filledCount} questions. Column G = correct answer letter (A/B/C/D/E).`] });
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

        {filledQuestions.map((q, i) => (
          <div key={i} className="space-y-3">
            <div className="flex gap-2.5">
              <span className="font-bold text-text text-sm shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1 space-y-1">
                <div
                  className="text-text text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMathHtml(q.stem) }}
                />
                {showAnswers && (q.difficulty || q.topic || q.marks !== 1) && (
                  <p className="text-xs text-muted italic">
                    {[
                      `${q.marks || 1} mark${(q.marks || 1) !== 1 ? "s" : ""}`,
                      q.difficulty,
                      q.topic,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
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
                ✓ Correct: {q.correct}
              </p>
            )}
            {showAnswers && q.explanation.trim() && (
              <div className="ml-6 text-xs text-text-2 bg-bg border border-border rounded-lg px-3 py-2">
                <span className="font-semibold text-text not-italic">Marking Guide: </span>
                <span className="italic">{q.explanation}</span>
              </div>
            )}
          </div>
        ))}

        {showAnswers && (
          <div className="mt-8 pt-6 border-t-2 border-border">
            <p className="text-xs font-bold text-text uppercase tracking-wider mb-3">Answer Key</p>
            <div className="flex flex-wrap gap-2">
              {filledQuestions.map((q, i) => (
                <span key={i} className="px-3 py-1.5 bg-success/10 border border-success/25 rounded-lg text-success font-bold font-mono text-sm">
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

  const validationErrors = validate();
  const isReady = validationErrors.length === 0 && filledCount > 0;

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── How-to Process Guide ── */}
      <div className="rounded-xl border border-blue-200/70 overflow-hidden bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-700/30">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/15 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
              How to build an exam — 5-step guide
            </span>
            {!showGuide && (
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                Click to expand
              </span>
            )}
          </div>
          <ChevronDown
            size={15}
            className={`text-blue-600 dark:text-blue-400 transition-transform duration-200 ${showGuide ? "rotate-180" : ""}`}
          />
        </button>

        {showGuide && (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[
                {
                  num: "1",
                  label: "Exam Details",
                  desc: "Fill in the title, subject, class, and section at the top of the builder.",
                  accent: "border-blue-200 bg-white dark:bg-blue-900/15",
                  numColor: "bg-blue-500",
                },
                {
                  num: "2",
                  label: "Type Questions",
                  desc: "Write each question in the 'Question Text' box. Use $math$ for equations.",
                  accent: "border-indigo-200 bg-white dark:bg-indigo-900/15",
                  numColor: "bg-indigo-500",
                },
                {
                  num: "3",
                  label: "Fill Options A–D",
                  desc: "Type each answer option in the A, B, C, D boxes below the question.",
                  accent: "border-violet-200 bg-white dark:bg-violet-900/15",
                  numColor: "bg-violet-500",
                },
                {
                  num: "4",
                  label: "Click Correct Answer",
                  desc: "REQUIRED: Click the letter (A, B, C or D) that is the correct answer in the orange box.",
                  accent: "border-amber-300 bg-amber-50 dark:bg-amber-900/20",
                  numColor: "bg-amber-500",
                  important: true,
                },
                {
                  num: "5",
                  label: "Preview & Export",
                  desc: "Switch to the Preview tab to see the exam, then Export as Word or Excel.",
                  accent: "border-green-200 bg-white dark:bg-green-900/15",
                  numColor: "bg-green-500",
                },
              ].map(({ num, label, desc, accent, numColor, important }) => (
                <div key={num} className={`rounded-xl p-3 border ${accent}`}>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`${numColor} text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0`}>
                      {num}
                    </span>
                    <span className={`text-xs font-bold ${important ? "text-amber-700 dark:text-amber-300" : "text-text"}`}>
                      {label}
                    </span>
                    {important && (
                      <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black tracking-wide">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] leading-relaxed ${important ? "text-amber-700/80 dark:text-amber-300/80" : "text-text-2"}`}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/15 dark:border-amber-700/30">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Most common mistake:</strong> Forgetting to click the correct answer letter in Step 4. Every question must have a correct answer selected before you can export. Look for the <strong>orange box</strong> below each question&apos;s options.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center bg-surface border border-border rounded-xl p-1.5 gap-1">
        {([
          { id: "build",   label: "Build Questions", icon: Edit3 },
          { id: "preview", label: "Preview",          icon: Eye },
          { id: "export",  label: "Export",           icon: Download },
        ] as { id: Tab; label: string; icon: ElementType }[]).map(({ id, label, icon: Icon }) => (
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
              const focusedLabel = getFocusedFieldLabel(absIdx);

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
                        ref={(el) => setFieldRef(`${absIdx}:stem`, el)}
                        value={q.stem}
                        onChange={(e) => setSlot(pageIdx, "stem", e.target.value)}
                        onFocus={() => setFocusedKey(`${absIdx}:stem`)}
                        rows={2}
                        placeholder={`Type question ${qNum}… Use $formula$ for inline math, $$formula$$ for display math.`}
                        className={`${iCls} resize-y`}
                      />
                      <KaTeXPreview text={q.stem} />
                    </div>

                    {/* Options A–D (2-col grid) */}
                    <div>
                      <label className="block text-xs font-semibold text-text-2 mb-2">Answer Options</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const fk = `opt${letter}` as "optA" | "optB" | "optC" | "optD";
                          const isCorrect = q.correct === letter;
                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors ${
                                isCorrect ? "bg-success text-white border-success" : "bg-bg border-border text-text-2"
                              }`}>
                                {letter}
                              </span>
                              <input
                                ref={(el) => setFieldRef(`${absIdx}:${fk}`, el)}
                                type="text"
                                value={q[fk]}
                                onChange={(e) => setSlot(pageIdx, fk, e.target.value)}
                                onFocus={() => setFocusedKey(`${absIdx}:${fk}`)}
                                placeholder={`Option ${letter}…`}
                                className={`${iCls} ${isCorrect ? "border-success/40 ring-1 ring-success/20" : ""}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* Option E — full width */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors ${
                          q.correct === "E" ? "bg-success text-white border-success" : "bg-bg border-border text-text-2"
                        }`}>E</span>
                        <input
                          ref={(el) => setFieldRef(`${absIdx}:optE`, el)}
                          type="text"
                          value={q.optE}
                          onChange={(e) => setSlot(pageIdx, "optE", e.target.value)}
                          onFocus={() => setFocusedKey(`${absIdx}:optE`)}
                          placeholder="Option E (optional)…"
                          className={`${iCls} ${q.correct === "E" ? "border-success/40 ring-1 ring-success/20" : ""}`}
                        />
                      </div>
                    </div>

                    {/* LaTeX Math Toolbar */}
                    <div className="border border-border rounded-lg p-3 bg-bg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Math Toolbar</span>
                        {focusedLabel ? (
                          <span className="text-[10px] text-primary font-medium">→ inserting into {focusedLabel}</span>
                        ) : (
                          <span className="text-[10px] text-muted italic">click a field above, then pick a symbol</span>
                        )}
                      </div>
                      <LaTeXToolbar onInsert={makeInsertHandler(absIdx)} />
                    </div>

                    {/* Correct Answer Selector — Step 4 */}
                    <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                      q.correct
                        ? "border-success/40 bg-success/5 dark:bg-success/5"
                        : q.stem
                        ? "border-amber-400 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-500/50"
                        : "border-dashed border-border/60 bg-bg/40"
                    }`}>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {q.correct
                          ? <CheckCircle size={15} className="text-success shrink-0" />
                          : <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        }
                        <p className={`text-xs font-black uppercase tracking-wider ${
                          q.correct ? "text-success" : "text-amber-700 dark:text-amber-300"
                        }`}>
                          {q.correct
                            ? "Step 4 done — Correct answer selected ✓"
                            : "Step 4: Click the correct answer letter below"}
                          {!q.correct && <span className="text-danger ml-1">*</span>}
                        </p>
                        {!q.correct && q.stem && (
                          <span className="ml-auto text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            Required before export
                          </span>
                        )}
                      </div>

                      {hasAnyOption ? (
                        <div>
                          <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mb-2.5 font-medium">
                            👇 Click the letter that is the <strong>correct answer</strong>:
                          </p>
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
                                  className={`min-w-[60px] px-5 py-3.5 rounded-xl text-lg font-black border-2 transition-all ${
                                    !optText
                                      ? "opacity-20 cursor-not-allowed bg-bg border-border text-muted"
                                      : isCorrect
                                        ? "bg-success text-white border-success shadow-lg scale-110 ring-4 ring-success/20"
                                        : "bg-white border-amber-300 text-amber-700 hover:border-success hover:text-success hover:bg-success/5 dark:bg-surface dark:border-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {letter}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2">
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ← Fill in options A–D above first, then click the correct letter here.
                          </span>
                        </div>
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
                          No answer selected — export will be blocked until you mark the correct letter.
                        </p>
                      ) : null}
                    </div>

                    {/* Per-question metadata */}
                    <div className="space-y-3 pt-1 border-t border-border">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="flex items-center gap-1 text-xs font-medium text-text-2 mb-1">
                            <Hash size={10} /> Marks
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={q.marks}
                            onChange={(e) => setSlot(pageIdx, "marks", Math.max(1, parseInt(e.target.value) || 1))}
                            className={iCls}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-xs font-medium text-text-2 mb-1">
                            <BarChart2 size={10} /> Difficulty
                          </label>
                          <select
                            value={q.difficulty}
                            onChange={(e) => setSlot(pageIdx, "difficulty", e.target.value)}
                            className={sCls}
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>{d || "— optional —"}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-xs font-medium text-text-2 mb-1">
                            <BookOpen size={10} /> Topic
                          </label>
                          <input
                            type="text"
                            value={q.topic}
                            onChange={(e) => setSlot(pageIdx, "topic", e.target.value)}
                            placeholder="e.g. Differentiation"
                            className={iCls}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-text-2 mb-1">
                          <Lightbulb size={10} /> Explanation / Marking Guide
                          <span className="text-muted font-normal ml-1">(shown in teacher export)</span>
                        </label>
                        <textarea
                          ref={(el) => setFieldRef(`${absIdx}:explanation`, el)}
                          value={q.explanation}
                          onChange={(e) => setSlot(pageIdx, "explanation", e.target.value)}
                          onFocus={() => setFocusedKey(`${absIdx}:explanation`)}
                          rows={2}
                          placeholder="Explain how to arrive at the correct answer…"
                          className={`${iCls} resize-y`}
                        />
                      </div>

                      {/* Visual Diagram Generator */}
                      <GenerateVisualButton
                        task="exam_diagram"
                        subject={meta.subject || undefined}
                        topic={q.topic || meta.title || undefined}
                        classLevel={meta.classLevel || undefined}
                        defaultStyle="diagram"
                        buttonLabel="Add Question Diagram"
                        onGenerated={(result) => setSlot(pageIdx, "diagramUrl", result.assetUrl)}
                      />

                      {/* Attached diagram preview */}
                      {q.diagramUrl && (
                        <div className="rounded-lg overflow-hidden border border-border bg-surface">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={q.diagramUrl}
                            alt="Question diagram"
                            className="w-full h-auto max-h-48 object-contain"
                          />
                          <div className="flex items-center justify-between px-3 py-2 bg-bg border-t border-border">
                            <span className="text-xs text-muted">Attached diagram</span>
                            <button
                              type="button"
                              onClick={() => setSlot(pageIdx, "diagramUrl", undefined)}
                              className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 transition-colors"
                            >
                              <X size={11} /> Remove
                            </button>
                          </div>
                        </div>
                      )}
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

          {/* Status — shows ALL validation errors */}
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            !isReady
              ? "bg-amber-50/40 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-700/50 dark:text-amber-400"
              : "bg-success/5 border-success/25 text-success"
          }`}>
            {!isReady
              ? <AlertCircle size={16} className="shrink-0 mt-0.5" />
              : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
            <div className="text-sm font-medium space-y-0.5">
              {isReady
                ? <p>{filledCount} question{filledCount !== 1 ? "s" : ""} ready to export.</p>
                : validationErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>

          {/* Word exports — main format */}
          <div className="bg-surface border-2 border-primary/20 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText size={16} className="text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-text">Word Document Export</h3>
                  <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Main Format</span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Professional print-ready exam — math rendered via KaTeX, no raw LaTeX in output
                </p>
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
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> Marks shown per question</li>
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
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Marking guides included</li>
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

          {/* Excel export */}
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

          {notice && <Notice type={notice.type} msgs={notice.msgs} />}
        </div>
      )}

      {notice && tab !== "export" && (
        <Notice type={notice.type} msgs={notice.msgs} />
      )}

    </div>
  );
}
