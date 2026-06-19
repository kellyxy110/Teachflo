import Link from "next/link";
import { Plus } from "lucide-react";
import { getLessons } from "@/app/actions/lessons";
import { LessonsListClient } from "./LessonsListClient";

export default async function LessonsPage() {
  const lessons = await getLessons();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Lessons</h1>
          <p className="text-sm text-text-2 mt-0.5">
            {lessons.length} saved lesson{lessons.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/lessons/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          New Lesson
        </Link>
      </div>

      <LessonsListClient lessons={lessons} />
    </div>
  );
}
