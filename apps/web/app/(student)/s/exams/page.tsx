import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { FileText, CheckCircle, Clock, ArrowRight } from "lucide-react";

export default async function StudentExamsPage() {
  const student = await requireStudent();

  const exams = await db.exam.findMany({
    where: { classId: student.classId, schoolId: student.schoolId },
    include: {
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId: student.id },
        select: { id: true, status: true, percentage: true, grade: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Practice Exams</h1>
        <p className="text-sm text-text-2">Exams assigned to your class. Take them to practice and improve.</p>
      </div>

      {exams.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <FileText size={32} className="text-text-2 mx-auto mb-3" />
          <p className="text-sm text-text-2">No exams available yet. Your teacher will add them soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const attempt = exam.attempts[0];
            const completed = attempt?.status === "GRADED" || attempt?.status === "SUBMITTED";

            return (
              <Link
                key={exam.id}
                href={`/s/exams/${exam.id}`}
                className="flex items-center gap-4 bg-surface border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${completed ? "bg-green-500/10" : "bg-primary/10"}`}>
                  {completed ? <CheckCircle size={20} className="text-green-500" /> : <FileText size={20} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{exam.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-2">{exam.subject}</span>
                    <span className="text-xs text-text-2">{exam._count.questions} questions</span>
                    {exam.duration && (
                      <span className="text-xs text-text-2 flex items-center gap-1">
                        <Clock size={10} /> {exam.duration} min
                      </span>
                    )}
                  </div>
                </div>
                {completed && attempt ? (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-text">{Math.round(attempt.percentage ?? 0)}%</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      (attempt.percentage ?? 0) >= 70 ? "bg-green-500/10 text-green-500"
                      : (attempt.percentage ?? 0) >= 50 ? "bg-amber-500/10 text-amber-500"
                      : "bg-red-500/10 text-red-500"
                    }`}>
                      {attempt.grade ?? "—"}
                    </span>
                  </div>
                ) : (
                  <ArrowRight size={16} className="text-text-2 group-hover:text-primary transition-colors shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
