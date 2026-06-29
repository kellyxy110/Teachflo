"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCurriculumTopics } from "@/app/actions/curriculum";
import type { ClassLevel, Term, CurriculumNode } from "@prisma/client";
import {
  BookOpen, Search, ChevronRight, Clock, Lock,
  Loader2, AlertCircle, Microscope,
} from "lucide-react";

const CLASS_LEVELS: ClassLevel[] = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
const TERMS: { value: Term; label: string }[] = [
  { value: "FIRST", label: "First" },
  { value: "SECOND", label: "Second" },
  { value: "THIRD", label: "Third" },
];

const DIFFICULTY_CONFIG = {
  EASY:   { label: "Easy",   color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
  MEDIUM: { label: "Medium", color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  HARD:   { label: "Hard",   color: "text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
};

const EXAM_BADGE_COLOR: Record<string, string> = {
  WAEC: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  NECO: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  JAMB: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
};

export function CurriculumBrowserClient({ subjects }: { subjects: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [classLevel, setClassLevel] = useState<ClassLevel>("SS1");
  const [term, setTerm] = useState<Term>("FIRST");
  const [topics, setTopics] = useState<CurriculumNode[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadTopics(s: string, cl: ClassLevel, t: Term) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getCurriculumTopics(s, cl, t);
        setTopics(result);
        setLoaded(true);
      } catch {
        setError("Could not load curriculum. Check your connection and try again.");
      }
    });
  }

  function handleSubject(s: string) {
    setSubject(s);
    loadTopics(s, classLevel, term);
  }

  function handleClass(cl: ClassLevel) {
    setClassLevel(cl);
    loadTopics(subject, cl, term);
  }

  function handleTerm(t: Term) {
    setTerm(t);
    loadTopics(subject, classLevel, t);
  }

  function openTopic(nodeId: string) {
    router.push(`/curriculum/${nodeId}`);
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text">Curriculum</h1>
          <p className="text-sm text-muted">Browse the Nigerian secondary school curriculum</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Subject</label>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted italic">No subjects loaded yet. Seed the curriculum first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubject(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    subject === s
                      ? "bg-primary text-white"
                      : "bg-bg border border-border text-text-2 hover:border-primary/40 hover:text-text"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Class Level */}
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Class</label>
          <div className="flex flex-wrap gap-2">
            {CLASS_LEVELS.map((cl) => (
              <button
                key={cl}
                onClick={() => handleClass(cl)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  classLevel === cl
                    ? "bg-primary text-white"
                    : "bg-bg border border-border text-text-2 hover:border-primary/40 hover:text-text"
                }`}
              >
                {cl.replace("JS", "JSS")}
              </button>
            ))}
          </div>
        </div>

        {/* Term */}
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Term</label>
          <div className="flex gap-2">
            {TERMS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleTerm(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  term === value
                    ? "bg-primary text-white"
                    : "bg-bg border border-border text-text-2 hover:border-primary/40 hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Load button when no auto-load */}
        {!loaded && (
          <button
            onClick={() => loadTopics(subject, classLevel, term)}
            disabled={!subject || isPending}
            className="w-full mt-1 py-2.5 rounded-lg bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:bg-primary/90"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isPending ? "Loading topics…" : "Browse Topics"}
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => loadTopics(subject, classLevel, term)}
            className="ml-auto text-xs font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-3 bg-border rounded w-16" />
              <div className="h-5 bg-border rounded w-3/4" />
              <div className="flex gap-2 mt-2">
                <div className="h-5 w-12 bg-border rounded-full" />
                <div className="h-5 w-14 bg-border rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topic list */}
      {!isPending && loaded && topics !== null && (
        <>
          {topics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="p-4 rounded-full bg-surface border border-border">
                <Microscope className="w-8 h-8 text-muted" />
              </div>
              <div>
                <p className="font-semibold text-text">No topics found</p>
                <p className="text-sm text-muted mt-1">
                  No topics are available for {subject} {classLevel.replace("JS", "JSS")} {term.toLowerCase()} term yet.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted font-medium">
                {topics.length} topic{topics.length !== 1 ? "s" : ""} · {subject} · {classLevel.replace("JS", "JSS")} · {term.toLowerCase()} term
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => openTopic(topic.id)}
                    className="group bg-surface border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {topic.week && (
                          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                            Week {topic.week}
                          </p>
                        )}
                        <p className="font-semibold text-text text-sm leading-snug group-hover:text-primary transition-colors">
                          {topic.label}
                        </p>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {topic.difficulty && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_CONFIG[topic.difficulty].color}`}>
                              {DIFFICULTY_CONFIG[topic.difficulty].label}
                            </span>
                          )}
                          {topic.estimatedMinutes && (
                            <span className="text-[10px] font-medium text-muted flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {topic.estimatedMinutes}m
                            </span>
                          )}
                          {topic.examStandards.slice(0, 3).map((std) => (
                            <span
                              key={std}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${EXAM_BADGE_COLOR[std] ?? "bg-border text-muted"}`}
                            >
                              {std}
                            </span>
                          ))}
                          {topic.bloomLevels.length > 0 && (
                            <span className="text-[10px] text-muted">
                              {topic.bloomLevels.slice(0, 2).join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {topic.examStandards.length > 0 && (
                          <Lock className="w-3.5 h-3.5 text-muted/40" />
                        )}
                        <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Initial empty state before first load */}
      {!isPending && !loaded && !error && subjects.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="p-4 rounded-full bg-surface border border-border">
            <BookOpen className="w-8 h-8 text-muted" />
          </div>
          <div>
            <p className="font-semibold text-text">Select filters to browse topics</p>
            <p className="text-sm text-muted mt-1">Choose a subject, class, and term above then tap Browse Topics.</p>
          </div>
        </div>
      )}
    </div>
  );
}
