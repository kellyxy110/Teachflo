import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getExam, deleteExam } from "@/app/actions/exams";
import { ExamDetailClient } from "./ExamDetailClient";
import { verifyExam } from "@/lib/trust";
import { TrustBadge } from "@/components/trust/TrustBadge";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = await getExam(examId);
  if (!exam) notFound();

  const sectionA = exam.questions.filter((q) => q.section === "A");
  const sectionB = exam.questions.filter((q) => q.section === "B");
  const sectionC = exam.questions.filter((q) => q.section === "C");
  const trustReport = verifyExam(exam.questions, exam.subject);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/exams"
          className="flex items-center gap-1.5 text-sm text-text-2 hover:text-text transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Exams
        </Link>
        <form
          action={async () => {
            "use server";
            await deleteExam(examId);
          }}
        >
          <button
            type="submit"
            className="text-xs text-danger hover:text-danger/80 px-3 py-1.5 rounded-lg hover:bg-danger/5 transition-colors"
          >
            Delete
          </button>
        </form>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {exam.classLevel}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {exam.subject}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {exam.examType.replace("_", " ")}
          </span>
          <TrustBadge report={trustReport} />
          <span className="text-xs text-muted">{exam.questions.length} questions</span>
          {exam.duration && <span className="text-xs text-muted">{exam.duration} min</span>}
        </div>
        <h1 className="text-2xl font-bold text-text">{exam.topic}</h1>
        <p className="text-sm text-muted mt-1">
          {exam.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <ExamDetailClient
        examTitle={exam.title}
        subject={exam.subject}
        classLevel={exam.classLevel}
        examType={exam.examType}
        difficulty={exam.difficulty}
        duration={exam.duration}
        sectionA={sectionA}
        sectionB={sectionB}
        sectionC={sectionC}
      />
    </div>
  );
}
