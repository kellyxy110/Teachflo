import Link from "next/link";
import { Plus, Brain, PenTool, Sparkles } from "lucide-react";
import { getExams } from "@/app/actions/exams";
import { ExamsListClient } from "./ExamsListClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function ExamsPage() {
  const exams = await getExams();

  return (
    <div className="space-y-6">
      <PageHeader title="Question Bank & Exams" breadcrumb={[{ label: "Teaching" }, { label: "Question Bank & Exams" }]} description={<>{exams.length} saved exam{exams.length !== 1 ? "s" : ""}. Build, review, and reuse questions in assessments.</>} secondaryActions={<div className="flex flex-wrap gap-2">
          {/* Manual builder — most prominent for manual creation */}
          <Link
            href="/exams/questions/new"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            <PenTool size={16} />
            Manual Builder
          </Link>
          <Link
            href="/exams/generate-ai"
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Sparkles size={16} />
            AI Generate
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
        </div>} />

      <ExamsListClient exams={exams} />
    </div>
  );
}
