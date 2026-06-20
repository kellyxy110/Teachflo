"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, AlertTriangle, TrendingUp, BookOpen, Target, Zap,
  ChevronRight, Loader2, BarChart2, Clock, RefreshCw, Trash2,
} from "lucide-react";
import { getStudentMistakeReport } from "@/app/actions/mistake-intelligence";
import { generateLearningPath, getStudentPaths } from "@/app/actions/adaptive-learning";
import { createCurriculumPlan, deleteCurriculumPlan } from "@/app/actions/curriculum-generator";
import type { MistakeReport, LearningPathData } from "@/lib/intelligence/types";

type Tab = "mistakes" | "learning" | "curriculum";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  class: { name: string; level: string };
}

const SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry", "Biology",
  "Further Mathematics", "Economics", "Government", "Literature in English",
  "Civic Education", "Computer Science", "Agricultural Science",
];

const CLASS_LEVELS = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
const TERMS = ["FIRST", "SECOND", "THIRD"];

export function IntelligenceDashboard({
  students,
  mistakeSummary,
  curriculumPlans: initialPlans,
}: {
  students: Student[];
  mistakeSummary: {
    topPatterns: Array<{ skill: string; errorType: string; totalOccurrences: number; studentCount: number }>;
    topPrerequisiteGaps: Array<{ gap: string; totalOccurrences: number }>;
  };
  curriculumPlans: Array<{ id: string; title: string; subject: string; classLevel: string; term: string; session: string; createdAt: Date }>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mistakes");
  const [isPending, startTransition] = useTransition();

  // Mistakes state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [mistakeReport, setMistakeReport] = useState<{ student: string; report: MistakeReport } | null>(null);

  // Learning path state
  const [pathStudent, setPathStudent] = useState("");
  const [pathSubject, setPathSubject] = useState("");
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);

  // Curriculum state
  const [curSubject, setCurSubject] = useState("");
  const [curClass, setCurClass] = useState("");
  const [curTerm, setCurTerm] = useState("FIRST");
  const [curSession, setCurSession] = useState("2025/2026");
  const [plans, setPlans] = useState(initialPlans);

  function loadMistakeReport() {
    if (!selectedStudent) return;
    startTransition(async () => {
      const result = await getStudentMistakeReport(selectedStudent);
      setMistakeReport(result);
    });
  }

  function loadLearningPath() {
    if (!pathStudent || !pathSubject) return;
    startTransition(async () => {
      const path = await generateLearningPath(pathStudent, pathSubject);
      setLearningPath(path);
    });
  }

  function handleCreateCurriculum() {
    if (!curSubject || !curClass || !curTerm) return;
    startTransition(async () => {
      await createCurriculumPlan({
        subject: curSubject,
        classLevel: curClass,
        term: curTerm,
        session: curSession,
      });
      router.refresh();
    });
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType; color: string }> = [
    { id: "mistakes", label: "Mistake Intelligence", icon: AlertTriangle, color: "#f59e0b" },
    { id: "learning", label: "Adaptive Learning", icon: TrendingUp, color: "#10b981" },
    { id: "curriculum", label: "Curriculum Generator", icon: BookOpen, color: "#3b82f6" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Brain size={24} className="text-primary" />
          Intelligence Core
        </h1>
        <p className="text-sm text-text-2 mt-0.5">
          Self-improving education intelligence — mistakes feed learning, learning feeds curriculum
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active ? "text-white" : "bg-surface border border-border text-text-2 hover:border-primary-100"
              }`}
              style={active ? { background: t.color } : {}}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Mistake Intelligence ────────────────────────────── */}
      {tab === "mistakes" && (
        <div className="space-y-6">
          {/* School-wide summary */}
          {mistakeSummary.topPatterns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-warning" /> Top Error Patterns
                </h3>
                <div className="space-y-2">
                  {mistakeSummary.topPatterns.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-text">{p.skill} <span className="text-text-2">({p.errorType})</span></span>
                      <span className="text-warning font-bold">{p.totalOccurrences}x</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                  <Target size={14} className="text-danger" /> Prerequisite Gaps
                </h3>
                <div className="space-y-2">
                  {mistakeSummary.topPrerequisiteGaps.map((g, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-text">{g.gap}</span>
                      <span className="text-danger font-bold">{g.totalOccurrences} students</span>
                    </div>
                  ))}
                  {mistakeSummary.topPrerequisiteGaps.length === 0 && (
                    <p className="text-sm text-text-2">No prerequisite gaps detected yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Student selector */}
          <div className="p-5 rounded-xl bg-surface border border-border">
            <h3 className="text-sm font-bold text-text mb-3">Analyze Student Mistakes</h3>
            <div className="flex gap-3">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.class.name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadMistakeReport}
                disabled={!selectedStudent || isPending}
                className="flex items-center gap-2 bg-warning text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                Analyze
              </button>
            </div>
          </div>

          {/* Mistake report */}
          {mistakeReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-text">
                  {mistakeReport.student} — {mistakeReport.report.totalMistakes} total mistakes
                </h3>
              </div>

              {mistakeReport.report.recurringPatterns.length > 0 && (
                <div className="p-4 rounded-xl bg-danger-50 border border-danger/20">
                  <h4 className="text-sm font-bold text-danger mb-2">Recurring Patterns (3+ occurrences)</h4>
                  {mistakeReport.report.recurringPatterns.map((p, i) => (
                    <div key={i} className="text-sm text-text mb-2">
                      <span className="font-medium">{p.errorType}:</span> {p.pattern}
                      {p.prerequisiteGap && (
                        <span className="text-danger ml-1">(Gap: {p.prerequisiteGap})</span>
                      )}
                      <span className="text-text-2 ml-2">×{p.occurrences}</span>
                    </div>
                  ))}
                </div>
              )}

              {mistakeReport.report.clusters.map((c) => (
                <div key={c.skill} className="p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-text">{c.skill}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-bold">
                      Severity: {c.severityScore}
                    </span>
                  </div>
                  {c.patterns.map((p, j) => (
                    <div key={j} className="text-xs text-text-2 mb-1">
                      <span className="capitalize font-medium text-text">{p.errorType}:</span> {p.pattern}
                      {p.rootCause && <span className="block ml-4 italic">Root: {p.rootCause}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Adaptive Learning ──────────────────────────────── */}
      {tab === "learning" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface border border-border">
            <h3 className="text-sm font-bold text-text mb-3">Generate Learning Path</h3>
            <div className="flex gap-3">
              <select
                value={pathStudent}
                onChange={(e) => setPathStudent(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.class.name}
                  </option>
                ))}
              </select>
              <select
                value={pathSubject}
                onChange={(e) => setPathSubject(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
              >
                <option value="">Subject...</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={loadLearningPath}
                disabled={!pathStudent || !pathSubject || isPending}
                className="flex items-center gap-2 bg-success text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Generate
              </button>
            </div>
          </div>

          {learningPath && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-text">
                  Learning Path — {learningPath.totalSteps} steps
                </h3>
                <span className="text-xs text-text-2">
                  {learningPath.completedSteps}/{learningPath.totalSteps} completed
                </span>
              </div>
              {learningPath.steps.map((step, i) => {
                const isCurrent = i === learningPath.currentStep;
                const typeColors: Record<string, string> = {
                  remediation: "#dc2626",
                  guided_practice: "#f59e0b",
                  new_concept: "#3b82f6",
                  assessment: "#8b5cf6",
                  review: "#10b981",
                };
                const color = typeColors[step.type] || "#64748b";
                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent ? "ring-2 ring-primary bg-primary-50 border-primary-100" : "bg-surface border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: color }}
                      >
                        {step.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-text">{step.topic}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={{ background: `${color}15`, color }}
                          >
                            {step.type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-text-2">{step.difficulty}</span>
                        </div>
                        <p className="text-xs text-text-2">{step.reason}</p>
                      </div>
                      <div className="text-xs text-text-2 flex items-center gap-1 shrink-0">
                        <Clock size={12} />
                        {step.estimatedMinutes}m
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Curriculum Generator ───────────────────────────── */}
      {tab === "curriculum" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface border border-border">
            <h3 className="text-sm font-bold text-text mb-3">Generate Curriculum Plan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <select value={curSubject} onChange={(e) => setCurSubject(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm">
                <option value="">Subject...</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={curClass} onChange={(e) => setCurClass(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm">
                <option value="">Class...</option>
                {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={curTerm} onChange={(e) => setCurTerm(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm">
                {TERMS.map((t) => <option key={t} value={t}>{t} Term</option>)}
              </select>
              <input
                value={curSession}
                onChange={(e) => setCurSession(e.target.value)}
                placeholder="2025/2026"
                className="px-4 py-2.5 rounded-lg border border-border bg-surface text-text text-sm"
              />
            </div>
            <button
              onClick={handleCreateCurriculum}
              disabled={!curSubject || !curClass || isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Generate Curriculum
            </button>
          </div>

          {plans.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text">Saved Plans</h3>
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between cursor-pointer hover:border-primary-100 transition-all"
                  onClick={() => router.push(`/intelligence/curriculum/${p.id}`)}
                >
                  <div>
                    <p className="text-sm font-bold text-text">{p.title}</p>
                    <p className="text-xs text-text-2">
                      {p.classLevel} · {p.term} Term · {p.session}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-text-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
