"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FileText, Clock, Plus, X } from "lucide-react";

type Exam = {
  id: string;
  subject: string;
  topic: string;
  classLevel: string;
  examType: string;
  difficulty: string;
  createdAt: Date;
  _count: { questions: number };
};

const TYPE_LABELS: Record<string, string> = {
  SCHOOL_TEST: "Test", SCHOOL_EXAM: "Exam",
  WAEC_MOCK: "WAEC Mock", JAMB_PREP: "JAMB", JUPEB_PREP: "JUPEB",
};
const DIFF_COLORS: Record<string, string> = {
  BASIC: "bg-blue-50 text-primary",
  APPLICATION: "bg-purple-50 text-purple-700",
  WAEC: "bg-green-50 text-success",
  JAMB: "bg-orange-50 text-orange-700",
  JUPEB: "bg-rose-50 text-danger",
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function ExamsListClient({ exams }: { exams: Exam[] }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");

  const levels = useMemo(() => [...new Set(exams.map((e) => e.classLevel))].sort(), [exams]);
  const types = useMemo(() => [...new Set(exams.map((e) => e.examType))].sort(), [exams]);
  const diffs = useMemo(() => [...new Set(exams.map((e) => e.difficulty))].sort(), [exams]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return exams.filter((e) => {
      const matchText = !q || e.topic.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q);
      const matchLevel = !levelFilter || e.classLevel === levelFilter;
      const matchType = !typeFilter || e.examType === typeFilter;
      const matchDiff = !diffFilter || e.difficulty === diffFilter;
      return matchText && matchLevel && matchType && matchDiff;
    });
  }, [exams, query, levelFilter, typeFilter, diffFilter]);

  const hasFilters = query || levelFilter || typeFilter || diffFilter;

  if (exams.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <FileText size={40} className="text-muted mx-auto mb-4" />
        <h3 className="font-semibold text-text mb-1">No exams yet</h3>
        <p className="text-sm text-text-2 mb-5">
          Generate a full exam paper — MCQ + Theory + distractor analysis — in under 60 seconds.
        </p>
        <Link
          href="/exams/new"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={15} /> Generate Exam
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
        >
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
        </select>
        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
        >
          <option value="">All difficulties</option>
          {diffs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQuery(""); setLevelFilter(""); setTypeFilter(""); setDiffFilter(""); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <p className="text-xs text-muted">
        {filtered.length} of {exams.length} exam{exams.length !== 1 ? "s" : ""}
        {hasFilters ? " match your filters" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-text-2">No exams match your filters.</p>
          <button
            onClick={() => { setQuery(""); setLevelFilter(""); setTypeFilter(""); setDiffFilter(""); }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((exam) => (
            <Link
              key={exam.id}
              href={`/exams/${exam.id}`}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group block"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                      {exam.classLevel}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                      {exam.subject}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                      {TYPE_LABELS[exam.examType] ?? exam.examType}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFF_COLORS[exam.difficulty] ?? "bg-bg text-text-2"}`}>
                      {exam.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold text-text group-hover:text-primary transition-colors truncate">
                    {exam.topic}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">{exam._count.questions} questions</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted shrink-0 mt-0.5">
                  <Clock size={12} />
                  {formatDate(exam.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
