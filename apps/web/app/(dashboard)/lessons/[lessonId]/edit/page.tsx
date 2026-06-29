import { notFound } from "next/navigation";
import { getLesson } from "@/app/actions/lessons";
import { LessonEditorClient } from "./LessonEditorClient";

export const metadata = { title: "Edit Lesson" };

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) notFound();

  const markdown = (lesson.content as { markdown?: string })?.markdown ?? "";

  return (
    <LessonEditorClient
      lessonId={lessonId}
      subject={lesson.subject}
      classLevel={lesson.classLevel}
      topic={lesson.topic}
      initialMarkdown={markdown}
    />
  );
}
