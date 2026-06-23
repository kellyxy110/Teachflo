import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
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

  const exam = await db.exam.findFirst({
    where: { id: examId, schoolId: student.schoolId },
    include: {
      questions: { orderBy: { number: "asc" } },
      attempts: {
        where: { studentId: student.id },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!exam) notFound();

  const attempt = exam.attempts[0];
  const completed = attempt?.status === "GRADED" || attempt?.status === "SUBMITTED";

  if (attempt && !completed) {
    redirect(`/dashboard/exams/v2/${attempt.id}`);
  }

  async function startExam() {
    "use server";
    const s = await requireStudent();
    const newAttempt = await db.examAttempt.create({
      data: {
        studentId: s.id,
        examId,
        schoolId: s.schoolId,
        status: "IN_PROGRESS",
        examMode: exam!.examMode,
      },
    });
    redirect(`/dashboard/exams/v2/${newAttempt.id}`);
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
        <h1 className="text-2xl font-bold text-text">{exam.title}</h1>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs font-medium px-2.5 py-1 bg-bg rounded-full text-text-2 border border-border">
            {exam.subject}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 bg-bg rounded-full text-text-2 border border-border">
            {exam.questions.length} questions
          </span>
          {exam.duration && (
            <span className="text-xs font-medium px-2.5 py-1 bg-bg rounded-full text-text-2 border border-border">
              {exam.duration} min
            </span>
          )}
        </div>

        {completed && attempt ? (
          <div className="space-y-3 pt-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="text-sm text-text-2">You&apos;ve already completed this exam</p>
            <p className="text-3xl font-black text-text">{Math.round(attempt.percentage ?? 0)}%</p>
            <Link
              href={`/dashboard/exams/v2/${attempt.id}/results`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              View Results
            </Link>
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
              Once you start, the timer begins. Answer all questions before submitting.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
