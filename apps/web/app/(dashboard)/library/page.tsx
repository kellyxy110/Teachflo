import Link from "next/link";
import { BookOpen, FileText, Upload } from "lucide-react";
import { getLibraryResources } from "@/app/actions/library";
import { LibraryClient } from "./LibraryClient";

export default async function LibraryPage() {
  const { lessons, exams, documents, allSubjects } = await getLibraryResources();
  const total = lessons.length + exams.length + documents.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Library</h1>
          <p className="text-text-2 text-sm mt-0.5">
            {total} resource{total !== 1 ? "s" : ""} — lessons, exams, and documents in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/lessons/new"
            className="flex items-center gap-1.5 border border-border text-text-2 px-3 py-2 rounded-lg text-sm font-medium hover:border-primary/30 hover:text-text transition-colors"
          >
            <BookOpen size={14} /> New Lesson
          </Link>
          <Link
            href="/exams/new"
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <FileText size={14} /> New Exam
          </Link>
        </div>
      </div>

      <LibraryClient
        lessons={lessons}
        exams={exams}
        documents={documents}
        subjects={allSubjects}
      />
    </div>
  );
}
