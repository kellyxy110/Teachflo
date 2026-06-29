"use client";

import { useState, useRef, useEffect } from "react";
import {
  Printer, Eye, EyeOff, ChevronDown, ChevronUp,
  FileSpreadsheet, Download, FileJson, FileCode2, BookOpen,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";
import {
  exportExamToExcel,
  exportCBTExcel,
  exportCSV,
  exportJSON,
  exportMoodleXML,
  exportQTI,
} from "@/lib/export";
import type { Question } from "@prisma/client";

export function ExamDetailClient({
  examTitle,
  subject,
  classLevel,
  examType,
  difficulty,
  duration,
  sectionA,
  sectionB,
  sectionC,
}: {
  examTitle: string;
  subject: string;
  classLevel: string;
  examType: string;
  difficulty: string;
  duration: number | null;
  sectionA: Question[];
  sectionB: Question[];
  sectionC: Question[];
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [openSection, setOpenSection] = useState<string>("A");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const sections = [
    { key: "A", label: "Section A — Multiple Choice", questions: sectionA },
    { key: "B", label: "Section B — Theory", questions: sectionB },
    { key: "C", label: "Section C — Advanced", questions: sectionC },
  ].filter((s) => s.questions.length > 0);

  const allQuestions = [...sectionA, ...sectionB, ...sectionC];
  const examMeta = { title: examTitle, subject, classLevel, examType };

  useEffect(() => {
    if (!exportOpen) return;
    function handleOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [exportOpen]);

  const EXPORT_OPTIONS = [
    {
      icon: <FileSpreadsheet size={14} className="text-green-600" />,
      label: "Full Export (.xlsx)",
      desc: "All questions + answers + solutions",
      action: () => exportExamToExcel(examMeta, allQuestions),
    },
    {
      icon: <BookOpen size={14} className="text-blue-600" />,
      label: "CBT Format (.xlsx)",
      desc: "Question, A–E, CorrectAnswer columns only",
      action: () => exportCBTExcel(examMeta, allQuestions),
    },
    {
      icon: <FileSpreadsheet size={14} className="text-orange-500" />,
      label: "CSV Export",
      desc: "Comma-separated — opens in any spreadsheet",
      action: () => exportCSV(examMeta, allQuestions),
    },
    {
      icon: <FileJson size={14} className="text-purple-600" />,
      label: "JSON Export",
      desc: "Structured data for API integration",
      action: () => exportJSON(examMeta, allQuestions),
    },
    {
      icon: <FileCode2 size={14} className="text-red-500" />,
      label: "Moodle XML",
      desc: "Import directly into Moodle LMS",
      action: () => exportMoodleXML(examMeta, allQuestions),
    },
    {
      icon: <FileCode2 size={14} className="text-indigo-500" />,
      label: "IMS QTI 2.1",
      desc: "For Canvas, Blackboard, and other LMS",
      action: () => exportQTI(examMeta, allQuestions),
    },
  ];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, aside, header, .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { font-size: 12pt; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center gap-3 no-print flex-wrap">
        <button
          onClick={() => setShowAnswers((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showAnswers
              ? "bg-success/10 text-success border-success/30"
              : "bg-surface text-text-2 border-border hover:border-primary/40"
          }`}
        >
          {showAnswers ? <><EyeOff size={14} /> Hide Answer Key</> : <><Eye size={14} /> Show Answer Key</>}
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border bg-surface text-text-2 hover:border-primary/40 transition-colors"
        >
          <Printer size={14} /> Print / PDF
        </button>

        {/* Export dropdown */}
        <div ref={exportRef} className="relative">
          <button
            onClick={() => setExportOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              exportOpen
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-surface text-text-2 border-border hover:border-primary/40"
            }`}
          >
            <Download size={14} />
            Export
            <ChevronDown size={12} className={`transition-transform ${exportOpen ? "rotate-180" : ""}`} />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Export {allQuestions.length} questions
                </p>
              </div>
              <div className="py-1">
                {EXPORT_OPTIONS.map(({ icon, label, desc, action }) => (
                  <button
                    key={label}
                    onClick={() => { action(); setExportOpen(false); }}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-bg transition-colors text-left"
                  >
                    <span className="mt-0.5 shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-text leading-tight">{label}</p>
                      <p className="text-[11px] text-muted leading-tight mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exam paper */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Paper header */}
        <div className="px-8 py-6 border-b border-border text-center">
          <h2 className="text-xl font-bold text-text uppercase tracking-wide">{examTitle}</h2>
          <p className="text-sm text-text-2 mt-1">
            {subject} · {classLevel} · {difficulty}
            {duration && ` · Time Allowed: ${duration} minutes`}
          </p>
          <div className="mt-4 flex gap-8 justify-center text-xs text-text-2">
            <span>Name: ___________________________</span>
            <span>Reg. No: ________________</span>
            <span>Date: ________________</span>
          </div>
        </div>

        {/* Sections */}
        <div className="divide-y divide-border">
          {sections.map(({ key, label, questions }) => {
            const isOpen = openSection === key;
            return (
              <div key={key}>
                <button
                  onClick={() => setOpenSection(isOpen ? "" : key)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg transition-colors no-print"
                >
                  <span className="font-semibold text-text">
                    {label}
                    <span className="ml-2 text-xs font-normal text-muted">
                      ({questions.length} question{questions.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                  {isOpen ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
                </button>

                {isOpen && (
                  <div className="px-6 pb-8 space-y-6 pt-2">
                    {questions.map((q) => (
                      <QuestionBlock key={q.id} q={q} showAnswers={showAnswers} />
                    ))}
                  </div>
                )}

                {/* Always show in print */}
                <div className="hidden print:block px-6 pb-8 space-y-6 pt-2">
                  <p className="text-sm font-semibold text-text-2 mb-4">{label}</p>
                  {questions.map((q) => (
                    <QuestionBlock key={q.id} q={q} showAnswers={showAnswers} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function QuestionBlock({ q, showAnswers }: { q: Question; showAnswers: boolean }) {
  const isMCQ = q.section === "A";

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <span className="shrink-0 font-bold text-sm text-text w-6 mt-0.5">{q.number}.</span>
        <div className="text-sm text-text leading-relaxed flex-1">
          <MathText text={q.stem || q.questionText || ""} />
          {q.markScheme && <span className="ml-2 text-xs text-muted">[{q.markScheme} marks]</span>}
        </div>
      </div>

      {isMCQ && (
        <div className="ml-9 grid grid-cols-2 gap-x-6 gap-y-1">
          {(["A", "B", "C", "D"] as const)
            .map((k) => ({ key: k, val: q[`option${k}` as keyof Question] as string | null }))
            .filter((o) => o.val)
            .map(({ key, val }) => (
              <div
                key={key}
                className={`flex items-start gap-2 text-sm py-0.5 ${
                  showAnswers && q.correctOption === key
                    ? "text-success font-semibold"
                    : "text-text"
                }`}
              >
                <span className="font-medium w-4 shrink-0">{key}.</span>
                <MathText text={val!} />
              </div>
            ))}
        </div>
      )}

      {showAnswers && (
        <div className="ml-9 mt-2 bg-bg rounded-lg px-4 py-3 space-y-2 border border-border">
          {isMCQ && q.correctOption && (
            <p className="text-xs font-semibold text-success">Answer: {q.correctOption}</p>
          )}
          {q.solution && (
            <div>
              <p className="text-xs font-semibold text-text-2 mb-0.5">Solution</p>
              <p className="text-xs text-text whitespace-pre-wrap">{q.solution}</p>
            </div>
          )}
          {q.explanation && (
            <p className="text-xs text-text-2">{q.explanation}</p>
          )}
          {q.examTip && (
            <p className="text-xs text-warning font-medium">Tip: {q.examTip}</p>
          )}
        </div>
      )}
    </div>
  );
}
