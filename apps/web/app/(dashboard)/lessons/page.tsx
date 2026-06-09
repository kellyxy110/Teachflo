import Link from "next/link";
import { Plus, BookOpen, Clock, Sparkles } from "lucide-react";
import { getLessons } from "@/app/actions/lessons";

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const MODE_COLORS: Record<string, string> = {
  STANDARD: "bg-blue-50 text-primary",
  ELI12: "bg-purple-50 text-purple-700",
  WAEC: "bg-green-50 text-success",
  JAMB: "bg-orange-50 text-orange-700",
  JUPEB: "bg-rose-50 text-danger",
};

export default async function LessonsPage() {
  const lessons = await getLessons();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Lessons</h1>
          <p className="text-sm text-text-2 mt-0.5">
            {lessons.length} saved lesson{lessons.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/lessons/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          New Lesson
        </Link>
      </div>

      {lessons.length === 0 ? (
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
      ) : (
        <div className="grid gap-3">
          {lessons.map((lesson) => (
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
