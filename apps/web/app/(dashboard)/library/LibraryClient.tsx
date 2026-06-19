"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, FileText, Clock, X, Sparkles, Upload, Database } from "lucide-react";
import { DocumentUpload } from "@/components/library/DocumentUpload";
import { DocumentList } from "@/components/library/DocumentList";

type Lesson = {
  id: string;
  subject: string;
  topic: string;
  classLevel: string;
  mode: string;
  week: number | null;
  term: string | null;
  createdAt: Date;
};

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

type Doc = {
  id: string;
  title: string;
  subject: string;
  classLevel: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  status: string;
  chunkCount: number;
  error: string | null;
  createdAt: Date;
};

const MODE_COLORS: Record<string, string> = {
  STANDARD: "bg-blue-50 text-primary border-blue-100",
  ELI12: "bg-purple-50 text-purple-700 border-purple-100",
  WAEC: "bg-green-50 text-success border-green-100",
  JAMB: "bg-orange-50 text-orange-700 border-orange-100",
  JUPEB: "bg-rose-50 text-danger border-rose-100",
};
const DIFF_COLORS: Record<string, string> = {
  BASIC: "bg-blue-50 text-primary border-blue-100",
  APPLICATION: "bg-purple-50 text-purple-700 border-purple-100",
  WAEC: "bg-green-50 text-success border-green-100",
  JAMB: "bg-orange-50 text-orange-700 border-orange-100",
  JUPEB: "bg-rose-50 text-danger border-rose-100",
};
const TYPE_LABELS: Record<string, string> = {
  SCHOOL_TEST: "Test", SCHOOL_EXAM: "Exam",
  WAEC_MOCK: "WAEC Mock", JAMB_PREP: "JAMB", JUPEB_PREP: "JUPEB",
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

type Tab = "all" | "lessons" | "exams" | "documents";

export function LibraryClient({
  lessons,
  exams,
  documents,
  subjects,
}: {
  lessons: Lesson[];
  exams: Exam[];
  documents: Doc[];
  subjects: string[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const allSubjects = useMemo(() => {
    const s = new Set([
      ...lessons.map((l) => l.subject),
      ...exams.map((e) => e.subject),
      ...documents.map((d) => d.subject),
    ]);
    return [...s].sort();
  }, [lessons, exams, documents]);

  const allLevels = useMemo(() => {
    const s = new Set([
      ...lessons.map((l) => l.classLevel),
      ...exams.map((e) => e.classLevel),
      ...documents.filter((d) => d.classLevel).map((d) => d.classLevel!),
    ]);
    return [...s].sort();
  }, [lessons, exams, documents]);

  const filteredLessons = useMemo(() => {
    const q = query.toLowerCase();
    return lessons.filter((l) => {
      const matchText = !q || l.topic.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q);
      const matchLevel = !levelFilter || l.classLevel === levelFilter;
      const matchSubject = !subjectFilter || l.subject === subjectFilter;
      return matchText && matchLevel && matchSubject;
    });
  }, [lessons, query, levelFilter, subjectFilter]);

  const filteredExams = useMemo(() => {
    const q = query.toLowerCase();
    return exams.filter((e) => {
      const matchText = !q || e.topic.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q);
      const matchLevel = !levelFilter || e.classLevel === levelFilter;
      const matchSubject = !subjectFilter || e.subject === subjectFilter;
      return matchText && matchLevel && matchSubject;
    });
  }, [exams, query, levelFilter, subjectFilter]);

  const filteredDocs = useMemo(() => {
    const q = query.toLowerCase();
    return documents.filter((d) => {
      const matchText = !q || d.title.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q);
      const matchLevel = !levelFilter || d.classLevel === levelFilter;
      const matchSubject = !subjectFilter || d.subject === subjectFilter;
      return matchText && matchLevel && matchSubject;
    });
  }, [documents, query, levelFilter, subjectFilter]);

  const hasFilters = query || levelFilter || subjectFilter;
  const isEmpty = lessons.length === 0 && exams.length === 0 && documents.length === 0;

  const showLessons = tab === "all" || tab === "lessons";
  const showExams = tab === "all" || tab === "exams";
  const showDocs = tab === "all" || tab === "documents";

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <DocumentUpload subjects={subjects} />
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Sparkles size={40} className="text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text mb-1">Library is empty</h3>
          <p className="text-sm text-text-2 mt-1 mb-5">
            Upload documents, generate lessons, or create exams to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/lessons/new"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <BookOpen size={15} /> Generate Lesson
            </Link>
            <Link
              href="/exams/new"
              className="inline-flex items-center gap-2 border border-border text-text-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:border-primary/30 transition-colors"
            >
              <FileText size={15} /> Generate Exam
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "lessons", "exams", "documents"] as Tab[]).map((t) => {
          const counts = {
            all: lessons.length + exams.length + documents.length,
            lessons: lessons.length,
            exams: exams.length,
            documents: documents.length,
          };
          const labels = { all: "All", lessons: "Lessons", exams: "Exams", documents: "Documents" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-text-2 hover:border-primary/30"
              }`}
            >
              {labels[t]} ({counts[t]})
            </button>
          );
        })}

        <div className="flex-1" />

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface w-44"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
        >
          <option value="">All subjects</option>
          {allSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
        >
          <option value="">All levels</option>
          {allLevels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQuery(""); setLevelFilter(""); setSubjectFilter(""); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Document upload (shown on documents tab or all tab) */}
      {showDocs && <DocumentUpload subjects={subjects} />}

      {/* Documents section */}
      {showDocs && (
        <div>
          {tab === "all" && filteredDocs.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Database size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-text">Documents</h2>
              <span className="text-xs text-muted">({filteredDocs.length})</span>
            </div>
          )}
          {tab === "documents" || (tab === "all" && filteredDocs.length > 0) ? (
            <DocumentList documents={filteredDocs} />
          ) : null}
        </div>
      )}

      {/* Lessons section */}
      {showLessons && filteredLessons.length > 0 && (
        <div>
          {tab === "all" && (
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-text">Lessons</h2>
              <span className="text-xs text-muted">({filteredLessons.length})</span>
            </div>
          )}
          <div className="grid gap-2">
            {filteredLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-1.5 rounded-lg bg-blue-50 shrink-0 mt-0.5">
                    <BookOpen size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                        {lesson.classLevel}
                      </span>
                      <span className="text-xs text-muted">{lesson.subject}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${MODE_COLORS[lesson.mode] ?? "bg-bg text-text-2 border-border"}`}>
                        {lesson.mode}
                      </span>
                      {lesson.week && <span className="text-xs text-muted">Wk {lesson.week}</span>}
                    </div>
                    <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
                      {lesson.topic}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted shrink-0 mt-0.5">
                  <Clock size={12} />
                  {formatDate(lesson.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Exams section */}
      {showExams && filteredExams.length > 0 && (
        <div>
          {tab === "all" && (
            <div className="flex items-center gap-2 mb-3 mt-2">
              <FileText size={15} className="text-purple-600" />
              <h2 className="text-sm font-semibold text-text">Exams</h2>
              <span className="text-xs text-muted">({filteredExams.length})</span>
            </div>
          )}
          <div className="grid gap-2">
            {filteredExams.map((exam) => (
              <Link
                key={exam.id}
                href={`/exams/${exam.id}`}
                className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-1.5 rounded-lg bg-purple-50 shrink-0 mt-0.5">
                    <FileText size={14} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                        {exam.classLevel}
                      </span>
                      <span className="text-xs text-muted">{exam.subject}</span>
                      <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                        {TYPE_LABELS[exam.examType] ?? exam.examType}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFF_COLORS[exam.difficulty] ?? "bg-bg text-text-2 border-border"}`}>
                        {exam.difficulty}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
                      {exam.topic}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{exam._count.questions} questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted shrink-0 mt-0.5">
                  <Clock size={12} />
                  {formatDate(exam.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty filtered state */}
      {hasFilters && filteredLessons.length === 0 && filteredExams.length === 0 && filteredDocs.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-text-2">Nothing matches your filters.</p>
          <button
            onClick={() => { setQuery(""); setLevelFilter(""); setSubjectFilter(""); }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
