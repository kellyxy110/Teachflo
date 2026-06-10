import { FileText } from "lucide-react";
import { ExamGeneratorClient } from "./ExamGeneratorClient";

export default function NewExamPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">AI Exam Generator</h1>
        </div>
        <p className="text-sm text-text-2">
          Generate full WAEC/JAMB/JUPEB-standard exam papers with MCQ, theory, and distractor analysis in under 60 seconds.
        </p>
      </div>
      <ExamGeneratorClient />
    </div>
  );
}
