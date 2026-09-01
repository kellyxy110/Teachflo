import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, PenLine } from "lucide-react";
import { getLesson, deleteLesson } from "@/app/actions/lessons";
import { LessonDetailClient } from "./LessonDetailClient";
import { verifyLesson } from "@/lib/trust";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { getLessonMarkdown, getLessonOrigin, getLessonReviewState, isLessonContentEnvelope } from "@/lib/lessons/content-envelope";
import { transitionLessonReview } from "@/app/actions/lessons";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) notFound();

  const markdown = getLessonMarkdown(lesson.content);
  const origin = getLessonOrigin(lesson.content);
  const reviewState = getLessonReviewState(lesson.content);
  const originalSource = isLessonContentEnvelope(lesson.content) ? lesson.content.sourceRepresentation : undefined;
  const sourceReferences = isLessonContentEnvelope(lesson.content) ? lesson.content.sourceReferences ?? [] : [];
  const trustReport = verifyLesson(markdown, lesson.subject, lesson.classLevel);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/lessons"
          className="flex items-center gap-1.5 text-sm text-text-2 hover:text-text transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Lessons
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/lessons/${lessonId}/edit`}
            className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-bg"
          >
            <PenLine size={13} />
            Edit
          </Link>
          <form
            action={async () => {
              "use server";
              await deleteLesson(lessonId);
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-danger/5"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </form>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {lesson.classLevel}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {lesson.subject}
          </span>
          <TrustBadge report={trustReport} />
          {reviewState && <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">{reviewState}</span>}
          {origin && <span className="text-xs text-muted">{origin.replaceAll("_", " ")}</span>}
          {lesson.week && (
            <span className="text-xs text-muted">Week {lesson.week}</span>
          )}
          {lesson.term && (
            <span className="text-xs text-muted capitalize">
              {lesson.term.toLowerCase().replace("_", " ")} Term
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text">{lesson.topic}</h1>
        <p className="text-sm text-muted mt-1">
          Generated {lesson.createdAt.toLocaleDateString("en-NG", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
        {reviewState && <div className="mt-3 flex flex-wrap gap-2"><span className="text-xs text-text-2">Approval is a Teacher decision, not curriculum or exam verification.</span>{reviewState === "DRAFT" && <form action={async () => { "use server"; await transitionLessonReview(lessonId, "REVIEWED"); }}><button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg">Mark as reviewed</button></form>}{reviewState === "REVIEWED" && <form action={async () => { "use server"; await transitionLessonReview(lessonId, "APPROVED"); }}><button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600">Approve for reuse</button></form>}</div>}
      </div>

      <LessonDetailClient
        lessonId={lessonId}
        originalMarkdown={markdown}
        subject={lesson.subject}
        classLevel={lesson.classLevel}
      />
      {originalSource !== undefined && <details className="rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer text-sm font-medium text-text">Original pasted source</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-bg p-3 text-xs leading-relaxed text-text-2">{originalSource}</pre><p className="mt-2 text-xs text-muted">This source is preserved separately from the editable lesson draft.</p></details>}
      {sourceReferences.length > 0 && <details className="rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer text-sm font-medium text-text">View source evidence ({sourceReferences.length})</summary><div className="mt-3 space-y-3">{sourceReferences.map((reference, index) => <div key={`${reference.documentId}-${index}`} className="border-l-2 border-primary/30 pl-3"><p className="text-xs font-semibold text-primary">Extracted from source{reference.sourceLocation?.page ? ` · Page ${reference.sourceLocation.page}${reference.sourceLocation.pageEnd && reference.sourceLocation.pageEnd > reference.sourceLocation.page ? `–${reference.sourceLocation.pageEnd}` : ""}` : reference.sourceLocation?.paragraph ? ` · Paragraph ${reference.sourceLocation.paragraph}` : reference.sourceLocation?.lineStart ? ` · Lines ${reference.sourceLocation.lineStart}${reference.sourceLocation.lineEnd && reference.sourceLocation.lineEnd > reference.sourceLocation.lineStart ? `–${reference.sourceLocation.lineEnd}` : ""}` : " · Location unavailable"}</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{reference.exactExcerpt}</pre></div>)}</div><p className="mt-3 text-xs text-muted">This evidence is preserved independently from the editable lesson. The original source may no longer be available.</p></details>}
    </div>
  );
}
