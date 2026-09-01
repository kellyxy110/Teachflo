import { Sparkles } from "lucide-react";
import { LessonGeneratorClient } from "./LessonGeneratorClient";
import { LessonCreationModes } from "./LessonCreationModes";
import { ManualLessonClient } from "./ManualLessonClient";
import { getPrivateSourceSelection } from "@/app/actions/documents";

export default async function NewLessonPage({ searchParams }: { searchParams: Promise<{ mode?: string; sourceDocumentId?: string; sourceChunkId?: string }> }) {
  const params = await searchParams;
  const mode = params.mode;
  const sourceSelection = mode === "manual" && params.sourceDocumentId && params.sourceChunkId
    ? await getPrivateSourceSelection(params.sourceDocumentId, params.sourceChunkId)
    : null;
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LessonCreationModes />
      {mode === "manual" || mode === "paste" ? <><h1 className="text-2xl font-bold text-text">{mode === "paste" ? "Paste Existing Note" : "Write Manually"}</h1><p className="text-sm text-text-2">Save a draft first. Review and approval are explicit Teacher actions.</p><ManualLessonClient mode={mode} sourceSelection={sourceSelection} /></> : <>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">AI Lesson Generator</h1>
        </div>
        <p className="text-sm text-text-2">
          Generate WAEC/JAMB-aligned lesson plans in seconds. Select your subject, class, and topic, then hit Generate.
        </p>
      <div id="ai-generator"><LessonGeneratorClient /></div></>}
    </div>
  );
}
