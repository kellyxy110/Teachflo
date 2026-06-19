import Link from "next/link";
import { Plus } from "lucide-react";
import { getExams } from "@/app/actions/exams";
import { ExamsListClient } from "./ExamsListClient";

export default async function ExamsPage() {
  const exams = await getExams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Exams</h1>
          <p className="text-sm text-text-2 mt-0.5">
            {exams.length} saved exam{exams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/exams/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          New Exam
        </Link>
      </div>

      <ExamsListClient exams={exams} />
    </div>
  );
}
