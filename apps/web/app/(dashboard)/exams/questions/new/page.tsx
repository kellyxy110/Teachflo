import { PenTool } from "lucide-react";
import { getTeacherExams } from "@/app/actions/questions";
import { QuestionBuilderClient } from "./QuestionBuilderClient";

export default async function NewQuestionPage() {
  const exams = await getTeacherExams();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PenTool size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Manual Question Builder</h1>
        </div>
        <p className="text-sm text-text-2">
          Create questions manually with full control — MCQ, Short Answer, Essay, Structured, or Calculation.
        </p>
      </div>
      <QuestionBuilderClient exams={exams} />
    </div>
  );
}
