import { Sparkles } from "lucide-react";
import { getTeacherExams } from "@/app/actions/questions";
import { GenerateAIClient } from "./GenerateAIClient";

export const metadata = { title: "AI Question Generator" };

export default async function GenerateAIPage() {
  const rawExams = await getTeacherExams();
  const exams = rawExams.map((ex) => ({
    id: ex.id,
    title: ex.title,
    questionCount: ex._count.questions,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">AI Question Generator</h1>
        </div>
        <p className="text-sm text-text-2">
          Select any topic from the curriculum graph and generate exam-calibrated MCQs
          anchored in real syllabus misconceptions, formulae, and Bloom&apos;s levels.
        </p>
      </div>

      <GenerateAIClient exams={exams} />
    </div>
  );
}
