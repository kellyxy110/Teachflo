import Link from "next/link";
import { PenTool, ChevronLeft } from "lucide-react";
import { getTeacherExams } from "@/app/actions/questions";
import { QuestionBuilderClient } from "./QuestionBuilderClient";

export default async function NewQuestionPage() {
  const exams = await getTeacherExams();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/exams"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-text mb-3 transition-colors"
        >
          <ChevronLeft size={13} /> Back to Exams
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <PenTool size={20} className="text-purple-600" />
          <h1 className="text-2xl font-bold text-text">Manual Exam Builder</h1>
        </div>
        <p className="text-sm text-text-2">
          Type your own questions, mark the correct answer (A–E), preview as student or teacher, and export to Word or Excel.
        </p>
      </div>
      <QuestionBuilderClient exams={exams} />
    </div>
  );
}
