import { notFound } from "next/navigation";
import { ArrowLeft, Library, PenTool, Trash2 } from "lucide-react";
import { getExam, deleteExam } from "@/app/actions/exams";
import { ExamDetailClient } from "./ExamDetailClient";
import { verifyExam } from "@/lib/trust";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { AssessmentBuilderOverview } from "@/components/exam/AssessmentBuilderOverview";
import { AssessmentLifecycleControls } from "@/components/exam/AssessmentLifecycleControls";

type QuestionSnapshot = {
  stem?: string;
  type?: string;
  correctOption?: string | null;
  solution?: string | null;
  markScheme?: string | null;
};

function numericMarks(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

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
  // Backfilled legacy questions already appear in exam.questions. Show only
  // relationships added through the reusable-question bridge here.
  const bridgeItems = exam.assessmentItems.filter((item) => item.question.examId !== exam.id);
  const trustReport = verifyExam(exam.questions, exam.subject);
  const legacyMarks = exam.questions.map((question) => numericMarks(question.defaultMarks ?? question.markScheme));
  const bridgeMarks = bridgeItems.map((item) => {
    const snapshot = item.questionVersion.payload as QuestionSnapshot;
    return numericMarks(item.marksOverride ?? snapshot.markScheme);
  });
  const allMarks = [...legacyMarks, ...bridgeMarks];
  const knownMarks = allMarks.reduce<number>((total, marks) => total + (marks ?? 0), 0);
  const questionCount = exam.questions.length + bridgeItems.length;
  const unknownMarksCount = allMarks.filter((marks) => marks === null).length;
  const answeredQuestionCount = exam.questions.filter((question) => Boolean(question.correctOption || question.solution || question.markScheme)).length
    + bridgeItems.filter((item) => {
      const snapshot = item.questionVersion.payload as QuestionSnapshot;
      return Boolean(snapshot.correctOption || snapshot.solution || snapshot.markScheme);
    }).length;
  const editable = exam._count.attempts === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Teaching" },
          { label: "Assessments", href: "/exams" },
          { label: "Review" },
        ]}
        title={exam.title}
        description={`${exam.topic} · Created ${exam.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`}
        status={<StatusBadge tone={editable ? "pending" : "warning"}>{editable ? "Editable" : "Locked"}</StatusBadge>}
        secondaryActions={
          <ButtonLink href="/exams" variant="quiet" size="sm">
            <ArrowLeft size={15} aria-hidden="true" /> Assessments
          </ButtonLink>
        }
        primaryAction={editable ? (
          <ButtonLink href={`/question-bank?assessmentId=${exam.id}`} size="sm">
            <Library size={15} aria-hidden="true" /> Add from Question Bank
          </ButtonLink>
        ) : undefined}
      />

      <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby="assessment-context-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="assessment-context-heading" className="text-sm font-semibold text-text">Academic context</h2>
            <p className="mt-1 text-xs text-text-2">The saved assessment configuration used for this review.</p>
          </div>
          <TrustBadge report={trustReport} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Class", exam.classLevel],
            ["Subject", exam.subject],
            ["Type", exam.examType.replaceAll("_", " ")],
            ["Difficulty", exam.difficulty.replaceAll("_", " ")],
            ["Duration", exam.duration ? `${exam.duration} minutes` : "Not set"],
            ["Mode", exam.examMode.replaceAll("_", " ")],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-0.5 font-semibold text-text">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <AssessmentBuilderOverview
        questionCount={questionCount}
        reusableQuestionCount={bridgeItems.length}
        knownMarks={knownMarks}
        unknownMarksCount={unknownMarksCount}
        answeredQuestionCount={answeredQuestionCount}
        duration={exam.duration}
        attemptCount={exam._count.attempts}
      />

      <section className="space-y-4" aria-labelledby="assessment-questions-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Questions</p>
            <h2 id="assessment-questions-heading" className="mt-1 text-lg font-bold text-text">Review assessment content</h2>
            <p className="mt-1 text-sm text-text-2">Check question wording, answer evidence, marks, order, and pinned reusable versions.</p>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/exams/questions/new" variant="secondary" size="sm">
                <PenTool size={15} aria-hidden="true" /> Create questions
              </ButtonLink>
              <ButtonLink href={`/question-bank?assessmentId=${exam.id}`} variant="secondary" size="sm">
                <Library size={15} aria-hidden="true" /> Browse Question Bank
              </ButtonLink>
            </div>
          )}
        </div>

        {questionCount === 0 && (
          <EmptyState
            icon={<Library size={36} />}
            title="No questions in this assessment"
            description="Add approved reusable questions from the Question Bank or use the existing manual question builder."
            action={editable ? <ButtonLink href={`/question-bank?assessmentId=${exam.id}`}>Add from Question Bank</ButtonLink> : undefined}
          />
        )}

      {bridgeItems.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby="reusable-assessment-items">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="reusable-assessment-items" className="font-semibold text-text">Questions from the Question Bank</h2>
              <p className="mt-1 text-sm text-text-2">Pinned reusable versions saved for this assessment.</p>
            </div>
            <StatusBadge tone="info">{bridgeItems.length} reusable</StatusBadge>
          </div>
          <ol className="mt-4 divide-y divide-border">
            {bridgeItems.map((item) => {
              const snapshot = item.questionVersion.payload as QuestionSnapshot;
              return (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">{item.order}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-6 text-text">{snapshot.stem ?? "Question content unavailable"}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <StatusBadge>{snapshot.type ?? item.question.type}</StatusBadge>
                      <StatusBadge>Version {item.questionVersion.version}</StatusBadge>
                      {item.marksOverride != null && <StatusBadge>{item.marksOverride} marks</StatusBadge>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

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
      </section>

      <AssessmentLifecycleControls examId={exam.id} lifecycle={exam.lifecycle} draftRevision={exam.draftRevision} duration={exam.duration} instructions={exam.instructions} opensAt={exam.opensAt} closesAt={exam.closesAt} attempts={exam._count.attempts} />

      {exam.lifecycle === "DRAFT" && exam._count.attempts === 0 && <section className="rounded-xl border border-danger/20 bg-surface p-4" aria-labelledby="assessment-danger-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="assessment-danger-heading" className="text-sm font-semibold text-text">Assessment record</h2>
            <p className="mt-1 text-xs text-text-2">Deletion uses the existing assessment behavior and may be restricted by related attempts or reusable items.</p>
          </div>
          <form
            action={async () => {
              "use server";
              await deleteExam(examId);
            }}
          >
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              <Trash2 size={14} aria-hidden="true" /> Delete assessment
            </button>
          </form>
        </div>
      </section>}
    </div>
  );
}
