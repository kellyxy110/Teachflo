import { requireStudent } from "@/lib/auth";
import { listStudentAssessments } from "@/lib/services/assessments/student-delivery";
import Link from "next/link";
import { FileText, CheckCircle, Clock, ArrowRight } from "lucide-react";

export default async function StudentExamsPage() {
  const student = await requireStudent();
  const exams = await listStudentAssessments({ id: student.id, schoolId: student.schoolId, classId: student.classId });

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
            const attempt = exam.attempt;
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
                    <span className="text-xs text-text-2">{exam.questionCount} questions</span>
                    {exam.duration && (
                      <span className="text-xs text-text-2 flex items-center gap-1">
                        <Clock size={10} /> {exam.duration} min
                      </span>
                    )}
                  </div>
                </div>
                {completed && attempt ? (
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-text-2">Submitted</p>
                  </div>
                ) : (
                  <span className="flex items-center gap-2 text-xs font-semibold text-text-2"><span>{exam.state === "SCHEDULED" ? "Upcoming" : exam.state === "CLOSED" ? "Closed" : attempt ? "Resume" : "Start"}</span><ArrowRight size={16} className="group-hover:text-primary transition-colors shrink-0" /></span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
