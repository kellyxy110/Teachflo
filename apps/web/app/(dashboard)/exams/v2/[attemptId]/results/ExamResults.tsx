"use client";

import Link from "next/link";
import {
  BarChart2, Brain, Target, AlertTriangle, CheckCircle2,
  XCircle, Clock, TrendingUp, BookOpen, ArrowLeft, Zap,
} from "lucide-react";
import type { PostExamAnalytics } from "@/lib/exam-v2/types";

interface ExamResultsData {
  attemptId: string;
  exam: {
    title: string;
    subject: string;
    topic: string;
    classLevel: string;
    examMode: string;
  };
  student: { firstName: string; lastName: string };
  grade: string | null;
  percentage: number | null;
  totalScore: number | null;
  maxScore: number | null;
  analytics: PostExamAnalytics | null;
  responses: Array<{
    questionId: string;
    selectedOption: string | null;
    isCorrect: boolean | null;
    score: number | null;
    timeSpentSeconds: number | null;
    misconception: string | null;
    errorType: string | null;
    feedback: string | null;
    question: {
      stem: string;
      correctOption: string | null;
      explanation: string;
      skillTag: string | null;
      topicTag: string | null;
      difficulty: string | null;
      bloomLevel: string | null;
    };
  }>;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a", B: "#0891b2", C: "#f59e0b", D: "#f97316", E: "#dc2626", F: "#991b1b",
};

export function ExamResults({ data }: { data: ExamResultsData }) {
  const analytics = data.analytics;
  const sr = analytics?.studentReport;
  const sys = analytics?.systemReport;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back + Header */}
      <div>
        <Link href="/exams" className="text-sm text-primary flex items-center gap-1 mb-4 hover:underline">
          <ArrowLeft size={14} /> Back to Exams
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{data.exam.title}</h1>
            <p className="text-sm text-text-2 mt-0.5">
              {data.student.firstName} {data.student.lastName} · {data.exam.subject} · {data.exam.classLevel}
            </p>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-black"
              style={{ color: GRADE_COLORS[data.grade ?? "F"] ?? "#64748b" }}
            >
              {data.grade ?? "—"}
            </div>
            <div className="text-sm text-text-2">{data.percentage?.toFixed(1) ?? 0}%</div>
          </div>
        </div>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Score", value: `${data.totalScore ?? 0}/${data.maxScore ?? 0}`, icon: Target, color: "#3b82f6" },
          { label: "Questions", value: `${data.responses.length}`, icon: BookOpen, color: "#8b5cf6" },
          { label: "Avg Time", value: sr ? `${sr.timeEfficiency.averagePerQuestion}s` : "—", icon: Clock, color: "#f59e0b" },
          { label: "Mode", value: data.exam.examMode, icon: Brain, color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color }} />
              <span className="text-xs text-text-2 font-semibold">{label}</span>
            </div>
            <div className="text-xl font-bold text-text">{value}</div>
          </div>
        ))}
      </div>

      {/* Topic breakdown */}
      {sr && sr.topicBreakdown.length > 0 && (
        <div className="p-6 rounded-xl bg-surface border border-border">
          <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            Topic Breakdown
          </h2>
          <div className="space-y-3">
            {sr.topicBreakdown.map((t) => (
              <div key={t.topic}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-text font-medium">{t.topic}</span>
                  <span className="text-text-2">
                    {t.correct}/{t.total} ({t.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t.percentage}%`,
                      background: t.percentage >= 70 ? "#16a34a" : t.percentage >= 50 ? "#f59e0b" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty progression (adaptive) */}
      {sr && sr.difficultyProgression.length > 1 && (
        <div className="p-6 rounded-xl bg-surface border border-border">
          <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Difficulty Progression
          </h2>
          <div className="flex items-end gap-1 h-20">
            {sr.difficultyProgression.map((d, i) => {
              const h = d === "hard" ? "100%" : d === "medium" ? "60%" : "30%";
              const bg = d === "hard" ? "#dc2626" : d === "medium" ? "#3b82f6" : "#16a34a";
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{ height: h, background: bg, minWidth: 4, maxWidth: 20 }}
                  title={`Q${i + 1}: ${d}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-text-2">
            <span>Q1</span>
            <span>Q{sr.difficultyProgression.length}</span>
          </div>
        </div>
      )}

      {/* Misconception clusters */}
      {sys && sys.misconceptionClusters.length > 0 && (
        <div className="p-6 rounded-xl bg-surface border border-border">
          <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            Misconception Analysis
          </h2>
          <div className="space-y-3">
            {sys.misconceptionClusters.map((c) => (
              <div key={c.errorType} className="p-3 rounded-lg bg-warning-50 border border-warning/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-text capitalize">
                    {c.errorType.replace("_", " ")}
                  </span>
                  <span className="text-xs text-warning font-bold">{c.count} occurrences</span>
                </div>
                <ul className="text-xs text-text-2 space-y-1">
                  {c.examples.map((ex, i) => (
                    <li key={i}>• {ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement suggestions */}
      {sr && sr.improvementSuggestions.length > 0 && (
        <div className="p-6 rounded-xl bg-primary-50 border border-primary-100">
          <h2 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
            <Zap size={16} />
            Improvement Suggestions
          </h2>
          <ul className="space-y-2">
            {sr.improvementSuggestions.map((s, i) => (
              <li key={i} className="text-sm text-text-2 flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question-by-question review */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-text flex items-center gap-2">
          <BookOpen size={16} className="text-primary" />
          Question Review
        </h2>
        {data.responses.map((r, i) => (
          <div
            key={r.questionId}
            className={`p-4 rounded-xl border ${
              r.isCorrect ? "bg-success-50/30 border-success/10" : "bg-danger-50/30 border-danger/10"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {r.isCorrect ? (
                  <CheckCircle2 size={16} className="text-success" />
                ) : (
                  <XCircle size={16} className="text-danger" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-text-2">Q{i + 1}</span>
                  {r.question.skillTag && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary-50 text-primary">
                      {r.question.skillTag}
                    </span>
                  )}
                  {r.question.difficulty && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted/10 text-muted">
                      {r.question.difficulty}
                    </span>
                  )}
                  {r.timeSpentSeconds && (
                    <span className="text-xs text-text-2">{r.timeSpentSeconds}s</span>
                  )}
                </div>
                <p className="text-sm text-text mb-1">{r.question.stem}</p>
                {!r.isCorrect && (
                  <div className="text-xs text-text-2 space-y-1">
                    {r.selectedOption && (
                      <p>Your answer: <span className="text-danger font-medium">{r.selectedOption}</span></p>
                    )}
                    {r.question.correctOption && (
                      <p>Correct: <span className="text-success font-medium">{r.question.correctOption}</span></p>
                    )}
                    {r.misconception && (
                      <p className="text-warning italic">{r.misconception}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-8">
        <Link
          href="/exams/v2/new"
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Brain size={16} /> Take Another Exam
        </Link>
        <Link
          href="/study-buddy"
          className="flex items-center gap-2 bg-surface border border-border text-text px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-50 transition-colors"
        >
          <BookOpen size={16} /> Study Weak Areas
        </Link>
      </div>
    </div>
  );
}
