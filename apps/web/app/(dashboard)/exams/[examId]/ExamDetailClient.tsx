"use client";

import { useState } from "react";
import { Printer, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { MathText } from "@/components/ui/MathText";
import type { Question } from "@prisma/client";

export function ExamDetailClient({
  examTitle,
  subject,
  classLevel,
  difficulty,
  duration,
  sectionA,
  sectionB,
  sectionC,
}: {
  examTitle: string;
  subject: string;
  classLevel: string;
  difficulty: string;
  duration: number | null;
  sectionA: Question[];
  sectionB: Question[];
  sectionC: Question[];
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [openSection, setOpenSection] = useState<string>("A");

  const sections = [
    { key: "A", label: "Section A — Multiple Choice", questions: sectionA },
    { key: "B", label: "Section B — Theory", questions: sectionB },
    { key: "C", label: "Section C — Advanced", questions: sectionC },
  ].filter((s) => s.questions.length > 0);

  function handlePrint() {
    window.print();
  }

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
      <div className="flex items-center gap-3 no-print">
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
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border bg-surface text-text-2 hover:border-primary/40 transition-colors"
        >
          <Printer size={14} /> Print / PDF
        </button>
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

                {(isOpen || typeof window !== "undefined" && false) && (
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
          {[
            { key: "A", val: q.optionA },
            { key: "B", val: q.optionB },
            { key: "C", val: q.optionC },
            { key: "D", val: q.optionD },
          ]
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
