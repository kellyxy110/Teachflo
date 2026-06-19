"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, Clock, Sparkles, X } from "lucide-react";

type Lesson = {
  id: string;
  subject: string;
  topic: string;
  classLevel: string;
  mode: string;
  week: number | null;
  createdAt: Date;
};

const MODE_COLORS: Record<string, string> = {
  STANDARD: "bg-blue-50 text-primary",
  ELI12: "bg-purple-50 text-purple-700",
  WAEC: "bg-green-50 text-success",
  JAMB: "bg-orange-50 text-orange-700",
  JUPEB: "bg-rose-50 text-danger",
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function LessonsListClient({ lessons }: { lessons: Lesson[] }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const levels = useMemo(
    () => [...new Set(lessons.map((l) => l.classLevel))].sort(),
    [lessons]
  );
  const modes = useMemo(
    () => [...new Set(lessons.map((l) => l.mode))].sort(),
    [lessons]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return lessons.filter((l) => {
      const matchText =
        !q ||
        l.topic.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q);
      const matchLevel = !levelFilter || l.classLevel === levelFilter;
      const matchMode = !modeFilter || l.mode === modeFilter;
      return matchText && matchLevel && matchMode;
    });
  }, [lessons, query, levelFilter, modeFilter]);

  const hasFilters = query || levelFilter || modeFilter;

  if (lessons.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <BookOpen size={40} className="text-muted mx-auto mb-4" />
        <h3 className="font-semibold text-text mb-1">No lessons yet</h3>
        <p className="text-sm text-text-2 mb-5">
          Generate your first AI-powered lesson plan tailored to the Nigerian curriculum.
        </p>
        <Link
          href="/lessons/new"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Sparkles size={15} /> Generate Lesson
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by topic or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
        >
          <option value="">All levels</option>
          {levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
        >
          <option value="">All modes</option>
          {modes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQuery(""); setLevelFilter(""); setModeFilter(""); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-muted">
        {filtered.length} of {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
        {hasFilters ? " match your filters" : ""}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-text-2">No lessons match your filters.</p>
          <button
            onClick={() => { setQuery(""); setLevelFilter(""); setModeFilter(""); }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group block"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                      {lesson.classLevel}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                      {lesson.subject}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODE_COLORS[lesson.mode] ?? "bg-bg text-text-2"}`}>
                      {lesson.mode}
                    </span>
                    {lesson.week && (
                      <span className="text-xs text-muted">Week {lesson.week}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-text text-base leading-snug group-hover:text-primary transition-colors truncate">
                    {lesson.topic}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0 mt-0.5">
                  <Clock size={12} />
                  {formatRelativeDate(lesson.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
