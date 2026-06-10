import Link from "next/link";
import { Plus, FileText, Clock } from "lucide-react";
import { getExams } from "@/app/actions/exams";

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

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

export default async function ExamsPage() {
  const exams = await getExams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Exams</h1>
          <p className="text-sm text-text-2 mt-0.5">
            {exams.length} saved exam{exams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/exams/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          New Exam
        </Link>
      </div>

      {exams.length === 0 ? (
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
      ) : (
        <div className="grid gap-3">
          {exams.map((exam) => (
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
