"use client";

import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Target,
  XCircle,
} from "lucide-react";
import type { StudentContext } from "@/app/actions/study-buddy";
import { useState } from "react";

interface Props {
  context: StudentContext | null;
  loading: boolean;
  sessionStats: {
    topicsCovered: string[];
    questionsAnswered: number;
    correctAnswers: number;
  };
}

function Collapsible({
  title,
  icon: Icon,
  defaultOpen,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-text hover:bg-bg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon size={13} className="text-muted" />
          {title}
          {badge && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-danger-50 text-danger">
              {badge}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && <div className="px-3 pb-3 border-t border-border">{children}</div>}
    </div>
  );
}

function SkillBar({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 70
      ? "bg-success"
      : pct >= 50
        ? "bg-warning"
        : "bg-danger";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-text-2 truncate mr-2">{label}</span>
        <span className="text-muted font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ContextPanel({ context, loading, sessionStats }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-bg rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!context) {
    return (
      <div className="text-center py-8 text-muted text-xs">
        <Target size={24} className="mx-auto mb-2 opacity-40" />
        <p>Select a student to see their learning profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Student header */}
      <div className="bg-primary-50 rounded-lg px-3 py-2.5">
        <p className="text-sm font-semibold text-primary">{context.name}</p>
        <p className="text-[11px] text-primary/70">{context.classLevel}</p>
      </div>

      {/* Weak skills */}
      <Collapsible
        title="Weak Areas"
        icon={AlertTriangle}
        defaultOpen
        badge={context.weakSkills.length > 0 ? String(context.weakSkills.length) : undefined}
      >
        {context.weakSkills.length === 0 ? (
          <p className="text-[11px] text-muted py-2">No weak areas detected yet</p>
        ) : (
          <div className="space-y-2.5 pt-2">
            {context.weakSkills.slice(0, 6).map((s) => (
              <SkillBar
                key={s.skill}
                label={s.topic || s.skill}
                pct={s.percentage}
              />
            ))}
          </div>
        )}
      </Collapsible>

      {/* Skill graph */}
      <Collapsible title="Skill Graph" icon={BarChart2}>
        {context.skills.length === 0 ? (
          <p className="text-[11px] text-muted py-2">No skill data yet</p>
        ) : (
          <div className="space-y-2.5 pt-2">
            {context.skills.slice(0, 8).map((s) => (
              <SkillBar
                key={s.skill}
                label={s.topic || s.skill}
                pct={s.percentage}
              />
            ))}
          </div>
        )}
      </Collapsible>

      {/* Recent mistakes */}
      <Collapsible title="Recent Mistakes" icon={XCircle}>
        {context.recentMistakes.length === 0 ? (
          <p className="text-[11px] text-muted py-2">No mistakes recorded yet</p>
        ) : (
          <div className="space-y-2 pt-2">
            {context.recentMistakes.slice(0, 5).map((m, i) => (
              <div key={i} className="text-[11px] p-2 bg-danger-50 rounded border border-danger/10">
                <p className="text-text font-medium line-clamp-2">{m.questionStem}</p>
                <p className="text-danger mt-0.5">
                  Chose: {m.selectedOption || "—"} | Correct: {m.correctOption || "—"}
                </p>
                {m.misconception && (
                  <p className="text-text-2 mt-0.5 italic">{m.misconception}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      {/* Recommended topics */}
      <Collapsible title="Recommended Topics" icon={BookOpen} defaultOpen>
        {context.recommendedTopics.length === 0 ? (
          <p className="text-[11px] text-muted py-2">Complete some exams to get recommendations</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {context.recommendedTopics.map((t, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-primary-50 text-primary text-[11px] rounded-md font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </Collapsible>

      {/* Session stats */}
      {(sessionStats.questionsAnswered > 0 || sessionStats.topicsCovered.length > 0) && (
        <Collapsible title="This Session" icon={Target} defaultOpen>
          <div className="space-y-2 pt-2 text-[11px]">
            {sessionStats.topicsCovered.length > 0 && (
              <div>
                <p className="text-muted mb-1">Topics covered</p>
                <div className="flex flex-wrap gap-1">
                  {sessionStats.topicsCovered.map((t, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-bg rounded text-text-2">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {sessionStats.questionsAnswered > 0 && (
              <div className="flex gap-4">
                <div>
                  <p className="text-muted">Answered</p>
                  <p className="text-text font-semibold text-sm">{sessionStats.questionsAnswered}</p>
                </div>
                <div>
                  <p className="text-muted">Correct</p>
                  <p className="text-success font-semibold text-sm">{sessionStats.correctAnswers}</p>
                </div>
                <div>
                  <p className="text-muted">Accuracy</p>
                  <p className="text-text font-semibold text-sm">
                    {sessionStats.questionsAnswered > 0
                      ? Math.round((sessionStats.correctAnswers / sessionStats.questionsAnswered) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}
    </div>
  );
}
