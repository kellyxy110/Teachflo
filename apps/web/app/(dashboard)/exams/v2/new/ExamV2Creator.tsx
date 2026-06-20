"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain, Zap, Target, BarChart2, Compass, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { createAdaptiveExam } from "@/app/actions/exam-v2";
import type { ExamModeType } from "@/lib/exam-v2/types";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  class: { name: string; level: string };
}

const CLASS_LEVELS = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"] as const;

const EXAM_TYPES = [
  { value: "SCHOOL_TEST", label: "School Test" },
  { value: "SCHOOL_EXAM", label: "School Exam" },
  { value: "WAEC_MOCK", label: "WAEC Mock" },
  { value: "JAMB_PREP", label: "JAMB Prep" },
  { value: "JUPEB_PREP", label: "JUPEB Prep" },
];

const DIFFICULTIES = [
  { value: "BASIC", label: "Basic" },
  { value: "APPLICATION", label: "Application" },
  { value: "WAEC", label: "WAEC Standard" },
  { value: "JAMB", label: "JAMB Standard" },
  { value: "JUPEB", label: "JUPEB Standard" },
];

const MODES: Array<{
  id: ExamModeType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}> = [
  { id: "DIAGNOSTIC", label: "Diagnostic", icon: Compass, description: "Identify weak skills — onboarding assessment", color: "#f59e0b" },
  { id: "PRACTICE", label: "Practice", icon: BookOpen, description: "Unlimited learning attempts, hints allowed", color: "#10b981" },
  { id: "ASSESSMENT", label: "Assessment", icon: BarChart2, description: "Strict WAEC-style grading, timed, no hints", color: "#3b82f6" },
  { id: "ADAPTIVE", label: "Adaptive", icon: Brain, description: "Next question depends on previous answer — dynamic difficulty", color: "#8b5cf6" },
];

const SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry", "Biology",
  "Further Mathematics", "Economics", "Government", "Literature in English",
  "Civic Education", "Computer Science", "Agricultural Science",
  "Commerce", "Accounting", "Geography", "History",
];

export function ExamV2Creator({ students }: { students: Student[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<ExamModeType>("ADAPTIVE");
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [examType, setExamType] = useState("SCHOOL_TEST");
  const [difficulty, setDifficulty] = useState("APPLICATION");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [error, setError] = useState("");

  const selectedStudent = students.find((s) => s.id === studentId);

  function handleCreate() {
    if (!studentId || !subject || !classLevel || !topic) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        const result = await createAdaptiveExam({
          subject,
          classLevel: classLevel as typeof CLASS_LEVELS[number],
          topic,
          examType: examType as "SCHOOL_TEST" | "SCHOOL_EXAM" | "WAEC_MOCK" | "JAMB_PREP" | "JUPEB_PREP",
          difficulty: difficulty as "BASIC" | "APPLICATION" | "WAEC" | "JAMB" | "JUPEB",
          mode,
          studentId,
          totalQuestions,
        });
        router.push(`/exams/v2/${result.attemptId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create exam");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Mode selector */}
      <div>
        <label className="block text-sm font-semibold text-text mb-3">Exam Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  selected
                    ? "ring-2 ring-offset-2 border-transparent"
                    : "border-border hover:border-primary-100"
                }`}
                style={selected ? { borderColor: m.color, background: `${m.color}08` } : {}}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} style={{ color: selected ? m.color : "#94a3b8" }} />
                  <span className="font-bold text-sm" style={{ color: selected ? m.color : undefined }}>
                    {m.label}
                  </span>
                </div>
                <p className="text-xs text-text-2">{m.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Student selector */}
      <div>
        <label className="block text-sm font-semibold text-text mb-2">Student</label>
        <select
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            const s = students.find((st) => st.id === e.target.value);
            if (s && !classLevel) setClassLevel(s.class.level);
          }}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
        >
          <option value="">Select student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName} — {s.class.name} ({s.regNumber || "N/A"})
            </option>
          ))}
        </select>
        {selectedStudent && (
          <p className="mt-1 text-xs text-text-2">
            Class: {selectedStudent.class.name} ({selectedStudent.class.level})
          </p>
        )}
      </div>

      {/* Subject + Topic */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
          >
            <option value="">Select subject...</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Class Level</label>
          <select
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
          >
            <option value="">Select level...</option>
            {CLASS_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-text mb-2">Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Quadratic Equations, Photosynthesis, Civil Rights..."
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
        />
      </div>

      {/* Exam Type + Difficulty + Questions */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Exam Type</label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Questions</label>
          <input
            type="number"
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(Math.max(5, Math.min(50, Number(e.target.value))))}
            min={5}
            max={50}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm">{error}</div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating exam blueprint &amp; questions...
          </>
        ) : (
          <>
            <Zap size={18} />
            Generate {mode} Exam
            <ChevronRight size={16} />
          </>
        )}
      </button>

      {/* Mode info */}
      {mode === "ADAPTIVE" && (
        <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 text-sm text-text-2">
          <p className="font-semibold text-primary mb-1">
            <Brain size={14} className="inline mr-1" />
            Adaptive Mode
          </p>
          <p>
            Questions are generated one at a time based on performance. Difficulty adjusts after
            each answer. The system prioritises weak skills and detects misconceptions in real time.
          </p>
        </div>
      )}

      {mode === "DIAGNOSTIC" && (
        <div className="p-4 rounded-xl bg-warning-50 border border-warning/20 text-sm text-text-2">
          <p className="font-semibold text-warning mb-1">
            <Target size={14} className="inline mr-1" />
            Diagnostic Mode
          </p>
          <p>
            Generates a balanced assessment across all difficulty levels to identify
            weak areas and establish a baseline skill profile for the student.
          </p>
        </div>
      )}
    </div>
  );
}
