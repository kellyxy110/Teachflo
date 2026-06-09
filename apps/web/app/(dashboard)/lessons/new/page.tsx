import { Sparkles } from "lucide-react";
import { LessonGeneratorClient } from "./LessonGeneratorClient";

export default function NewLessonPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">AI Lesson Generator</h1>
        </div>
        <p className="text-sm text-text-2">
          Generate WAEC/JAMB-aligned lesson plans in seconds. Select your subject, class, and topic, then hit Generate.
        </p>
      </div>

      <LessonGeneratorClient />
    </div>
  );
}
