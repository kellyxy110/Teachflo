import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getLesson, deleteLesson } from "@/app/actions/lessons";
import { LessonDetailClient } from "./LessonDetailClient";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) notFound();

  const markdown = (lesson.content as { markdown?: string })?.markdown ?? "";

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

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {lesson.classLevel}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
            {lesson.subject}
          </span>
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
      </div>

      <LessonDetailClient
        lessonId={lessonId}
        originalMarkdown={markdown}
        subject={lesson.subject}
        classLevel={lesson.classLevel}
      />
    </div>
  );
}
