import { FileText, Sparkles } from "lucide-react";

export default function ExamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Exams</h1>
          <p className="text-text-2 text-sm mt-0.5">
            Generate WAEC, JAMB, and JUPEB-standard examination papers with AI.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <Sparkles size={16} />
          Generate Exam
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <FileText size={40} className="text-muted mx-auto mb-3" />
        <h3 className="font-semibold text-text">No exams yet</h3>
        <p className="text-sm text-text-2 mt-1">
          Generate a full exam paper — MCQ + Theory + distractor analysis — in under 60 seconds.
        </p>
        <button className="mt-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors mx-auto">
          <Sparkles size={16} />
          Generate Exam
        </button>
      </div>
    </div>
  );
}
