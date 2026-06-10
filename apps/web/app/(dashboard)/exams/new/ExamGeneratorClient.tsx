"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { saveExam } from "@/app/actions/exams";
import type { ClassLevel, ExamType, Difficulty } from "@prisma/client";

const CLASS_LEVELS: ClassLevel[] = ["JS1","JS2","JS3","SS1","SS2","SS3"];
const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Agricultural Science","Economics","Government","Literature in English",
  "Geography","History","Civic Education","Christian Religious Studies",
  "Islamic Studies","Further Mathematics","Technical Drawing",
  "Food and Nutrition","Computer Studies","French",
];
const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "SCHOOL_TEST", label: "School Test" },
  { value: "SCHOOL_EXAM", label: "School Exam" },
  { value: "WAEC_MOCK", label: "WAEC Mock" },
  { value: "JAMB_PREP", label: "JAMB Prep" },
  { value: "JUPEB_PREP", label: "JUPEB Prep" },
];
const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  { value: "BASIC", label: "Basic", description: "Recall & identification" },
  { value: "APPLICATION", label: "Application", description: "Apply formulas & concepts" },
  { value: "WAEC", label: "WAEC", description: "Authentic WAEC difficulty" },
  { value: "JAMB", label: "JAMB", description: "JAMB MCQ speed & accuracy" },
  { value: "JUPEB", label: "JUPEB", description: "Pre-degree depth" },
];

type GeneratedExam = Record<string, unknown>;

export function ExamGeneratorClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedExam | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    subject: "",
    classLevel: "" as ClassLevel | "",
    topic: "",
    examType: "SCHOOL_EXAM" as ExamType,
    difficulty: "WAEC" as Difficulty,
    mcqCount: 10,
    theoryCount: 3,
    advancedCount: 2,
  });

  async function generate() {
    if (!form.subject || !form.classLevel || !form.topic) return;
    setGenerating(true);
    setGenerated(null);
    setError("");

    try {
      const res = await fetch("/api/exams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setGenerated(data);
    } catch {
      setError("Generation failed. Check your OPENAI_API_KEY and try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    if (!generated || !form.classLevel) return;
    startTransition(async () => {
      const id = await saveExam({
        subject: form.subject,
        classLevel: form.classLevel as ClassLevel,
        topic: form.topic,
        examType: form.examType,
        difficulty: form.difficulty,
        generated: generated as Parameters<typeof saveExam>[0]["generated"],
      });
      router.push(`/exams/${id}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Config form */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
        <h3 className="font-semibold text-text">Exam Settings</h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-2 mb-1">Subject *</label>
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            >
              <option value="">Select...</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Class *</label>
            <select
              value={form.classLevel}
              onChange={(e) => setForm((f) => ({ ...f, classLevel: e.target.value as ClassLevel }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            >
              <option value="">Select...</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Exam Type</label>
            <select
              value={form.examType}
              onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value as ExamType }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            >
              {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">MCQ / Theory / Advanced</label>
            <div className="flex gap-1">
              {(["mcqCount","theoryCount","advancedCount"] as const).map((k) => (
                <input
                  key={k}
                  type="number"
                  min={0}
                  max={30}
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-2 border border-border rounded-lg text-sm text-text text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-2 mb-1">Topic *</label>
          <input
            type="text"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. Electromagnetic Induction, Quadratic Equations, Cell Division..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-medium text-text-2 mb-2">Difficulty</label>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTIES.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setForm((f) => ({ ...f, difficulty: value }))}
                title={description}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  form.difficulty === value
                    ? "bg-primary text-white border-primary"
                    : "bg-bg text-text-2 border-border hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generate}
            disabled={!form.subject || !form.classLevel || !form.topic || generating || isPending}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <><RefreshCw size={15} className="animate-spin" /> Generating...</>
            ) : (
              <><Sparkles size={15} /> Generate Exam</>
            )}
          </button>
          {generated && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 bg-success text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              <Save size={15} />
              {isPending ? "Saving..." : "Save Exam"}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* Preview */}
      {generated && <ExamPreview data={generated} />}
    </div>
  );
}

type QuestionData = {
  number: number;
  stem?: string;
  questionText?: string;
  options?: Record<string, string>;
  correctOption?: string;
  marks?: number;
  solution?: string;
  explanation?: string;
  examTip?: string;
};

type SectionData = {
  title?: string;
  instructions?: string;
  questions?: QuestionData[];
};

function ExamPreview({ data }: { data: GeneratedExam }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("A");

  const examMeta = data.exam as Record<string, string> | undefined;
  const sections = data.sections as Record<string, SectionData> | undefined;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-bg flex items-center justify-between">
        <div>
          <h2 className="font-bold text-text">{examMeta?.title}</h2>
          <p className="text-xs text-text-2 mt-0.5">
            {examMeta?.subject} · {examMeta?.class} · {examMeta?.difficulty} · {examMeta?.duration}min
          </p>
        </div>
        <button
          onClick={() => setShowAnswers((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showAnswers
              ? "bg-success/10 text-success border-success/30"
              : "bg-bg text-text-2 border-border hover:border-primary/40"
          }`}
        >
          {showAnswers ? "Hide Answers" : "Show Answer Key"}
        </button>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border">
        {["A","B","C"].map((key) => {
          const section = sections?.[key];
          if (!section?.questions?.length) return null;
          const isOpen = openSection === key;

          return (
            <div key={key}>
              <button
                onClick={() => setOpenSection(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-bg transition-colors"
              >
                <span className="font-semibold text-sm text-text">
                  {section.title ?? `Section ${key}`}
                  <span className="ml-2 text-xs font-normal text-muted">
                    ({section.questions.length} question{section.questions.length !== 1 ? "s" : ""})
                  </span>
                </span>
                {isOpen ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
              </button>

              {isOpen && (
                <div className="px-6 pb-6 space-y-5">
                  {section.instructions && (
                    <p className="text-xs text-text-2 italic border-l-2 border-primary/20 pl-3">{section.instructions}</p>
                  )}
                  {section.questions.map((q) => (
                    <QuestionCard key={q.number} q={q} sectionKey={key} showAnswers={showAnswers} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({ q, sectionKey, showAnswers }: { q: QuestionData; sectionKey: string; showAnswers: boolean }) {
  const isMCQ = sectionKey === "A" && q.options;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
          {q.number}
        </span>
        <p className="text-sm text-text leading-relaxed flex-1">
          {q.stem ?? q.questionText}
        </p>
        {q.marks && <span className="text-xs text-muted shrink-0">[{q.marks} marks]</span>}
      </div>

      {isMCQ && q.options && (
        <div className="ml-9 grid grid-cols-1 gap-1">
          {Object.entries(q.options).map(([opt, text]) => (
            <div
              key={opt}
              className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-sm ${
                showAnswers && q.correctOption === opt
                  ? "bg-success/10 text-success font-medium"
                  : "text-text"
              }`}
            >
              <span className="font-semibold shrink-0 w-4">{opt}.</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}

      {showAnswers && (
        <div className="ml-9 space-y-2 border-t border-border pt-3">
          {q.solution && (
            <div>
              <p className="text-xs font-semibold text-text-2 mb-1">Solution</p>
              <p className="text-xs text-text whitespace-pre-wrap">{q.solution}</p>
            </div>
          )}
          {q.explanation && (
            <div>
              <p className="text-xs font-semibold text-text-2 mb-1">Why</p>
              <p className="text-xs text-text-2">{q.explanation}</p>
            </div>
          )}
          {q.examTip && (
            <div className="bg-warning/10 rounded-lg px-3 py-2">
              <p className="text-xs text-warning font-medium">Exam Tip: {q.examTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
