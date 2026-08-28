import { requireStudent } from "@/lib/auth";
import { getStudentAssessment } from "@/lib/services/assessments/student-delivery";
import { startPublishedAssessment } from "@/app/actions/student-assessments";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, CheckCircle } from "lucide-react";

export default async function StudentExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const student = await requireStudent();
  let assessment;
  try { assessment = await getStudentAssessment(examId, { id: student.id, schoolId: student.schoolId, classId: student.classId }); }
  catch { notFound(); }
  if (!assessment) notFound();
  const { publication, attempt } = assessment;
  const completed = attempt?.status === "GRADED" || attempt?.status === "SUBMITTED";

  if (attempt && !completed) {
    redirect(`/s/exams/${examId}/take/${attempt.id}`);
  }

  async function startExam() {
    "use server";
    const result = await startPublishedAssessment(examId);
    redirect(`/s/exams/${examId}/take/${result.attemptId}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/s/exams"
        className="flex items-center gap-1.5 text-sm text-text-2 hover:text-text transition-colors"
      >
        <ArrowLeft size={15} /> Back to Exams
      </Link>

      <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-text">{publication.title}</h1>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs font-medium px-2.5 py-1 bg-bg rounded-full text-text-2 border border-border">
            {publication.subject}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 bg-bg rounded-full text-text-2 border border-border">
            {publication.items.length} questions
          </span>
          {publication.duration && (
            <span className="text-xs font-medium px-2.5 py-1 bg-bg rounded-full text-text-2 border border-border">
              {publication.duration} min
            </span>
          )}
        </div>

        <div className="grid gap-3 text-left sm:grid-cols-2">
          <div><p className="text-xs font-medium uppercase tracking-wide text-text-2">Instructions</p><p className="mt-1 whitespace-pre-wrap text-sm text-text">{publication.instructions || "Read each question carefully and submit before the deadline."}</p></div>
          <div><p className="text-xs font-medium uppercase tracking-wide text-text-2">Availability</p><p className="mt-1 text-sm text-text">{publication.opensAt ? `Opens ${publication.opensAt.toLocaleString()}` : "Available now"}{publication.closesAt ? ` · closes ${publication.closesAt.toLocaleString()}` : ""}</p><p className="mt-1 text-xs text-text-2">Result release: {publication.resultReleasePolicy.replaceAll("_", " ").toLowerCase()}</p></div>
        </div>
        {completed && attempt ? (
          <div className="space-y-3 pt-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="text-sm text-text-2">You&apos;ve already completed this exam</p>
            <p className="text-sm text-text-2">Your result will appear according to the teacher&apos;s release policy.</p>
            <Link href={`/s/exams/${examId}/result/${attempt.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">View result status</Link>
          </div>
        ) : (
          <form action={startExam} className="pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <Play size={16} /> Start Exam
            </button>
            <p className="text-xs text-text-2 mt-3">
              Once you start, the server records the publication and deadline. You can resume an active attempt.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
