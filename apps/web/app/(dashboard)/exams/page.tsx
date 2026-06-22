import Link from "next/link";
import { Plus, Brain, PenTool } from "lucide-react";
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
        <div className="flex items-center gap-2">
          <Link
            href="/exams/questions/new"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            <PenTool size={16} />
            Add Question
          </Link>
          <Link
            href="/exams/v2/new"
            className="flex items-center gap-2 bg-waec text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-colors"
          >
            <Brain size={16} />
            AI Exam 2.0
          </Link>
          <Link
            href="/exams/new"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            <Plus size={16} />
            New Exam
          </Link>
        </div>
      </div>

      <ExamsListClient exams={exams} />
    </div>
  );
}
