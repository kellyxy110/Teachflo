"use client";

import { useState } from "react";
import {
  ImageIcon, Wand2, Download, X, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import type { MediaTask, MediaStyle, GenerateMediaOutput } from "@/lib/media/types";

interface Props {
  task?: MediaTask;
  subject?: string;
  topic?: string;
  classLevel?: string;
  defaultStyle?: MediaStyle;
  buttonLabel?: string;
  onGenerated?: (result: GenerateMediaOutput) => void;
}

const STYLE_OPTIONS: { value: MediaStyle; label: string; desc: string }[] = [
  { value: "diagram",     label: "Diagram",     desc: "Clear labelled technical diagram" },
  { value: "realistic",   label: "Realistic",   desc: "Photorealistic illustration" },
  { value: "minimal",     label: "Minimal",     desc: "Clean flat design" },
  { value: "infographic", label: "Infographic", desc: "Data/info visual with text" },
  { value: "worksheet",   label: "Worksheet",   desc: "B&W printable figure" },
  { value: "slide",       label: "Slide",       desc: "Presentation visual" },
  { value: "poster",      label: "Poster",      desc: "Classroom wall poster" },
];

const ASPECT_OPTIONS = [
  { value: "1:1",  label: "Square (1:1)"    },
  { value: "4:3",  label: "Landscape (4:3)" },
  { value: "16:9", label: "Wide (16:9)"     },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "A4",   label: "A4 Page"         },
] as const;

const TASK_LABELS: Record<string, string> = {
  lesson_diagram:   "Lesson Diagram",
  exam_diagram:     "Exam Figure",
  slide_visual:     "Slide Visual",
  flashcard_image:  "Flashcard Image",
  infographic:      "Infographic",
  poster:           "Poster",
  worksheet_figure: "Worksheet Figure",
};

export function GenerateVisualButton({
  task = "lesson_diagram",
  subject = "",
  topic = "",
  classLevel = "",
  defaultStyle = "diagram",
  buttonLabel,
  onGenerated,
}: Props) {
  const [open, setOpen]           = useState(false);
  const [prompt, setPrompt]       = useState("");
  const [style, setStyle]         = useState<MediaStyle>(defaultStyle);
  const [aspectRatio, setAspect]  = useState("1:1");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<GenerateMediaOutput | null>(null);

  const suggestedPrompt = topic
    ? `Educational ${style} showing ${topic}${subject ? ` in ${subject}` : ""}`
    : "";

  const effectivePrompt = prompt.trim() || suggestedPrompt;

  async function generate() {
    if (!effectivePrompt) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          prompt: effectivePrompt,
          subject: subject || undefined,
          topic: topic || undefined,
          classLevel: classLevel || undefined,
          style,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      const output = data as GenerateMediaOutput;
      setResult(output);
      onGenerated?.(output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.assetUrl;
    const ext = result.metadata.mimeType === "image/png" ? "png" : "jpg";
    a.download = `teachnexis-${task}-${Date.now()}.${ext}`;
    a.click();
  }

  const label = buttonLabel ?? `Generate ${TASK_LABELS[task] ?? "Visual"}`;

  const selCls =
    "w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Wand2 size={15} className="text-primary shrink-0" />
          <span className="text-sm font-semibold text-text">{label}</span>
          <span className="text-xs text-muted font-normal hidden sm:inline">AI Visual Aid</span>
        </div>
        {open
          ? <ChevronUp  size={15} className="text-muted shrink-0" />
          : <ChevronDown size={15} className="text-muted shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4 bg-bg">
          {/* Style + Aspect */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Visual Style</label>
              <select value={style} onChange={(e) => setStyle(e.target.value as MediaStyle)} className={selCls}>
                {STYLE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspect(e.target.value)} className={selCls}>
                {ASPECT_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">
              What to generate
              {suggestedPrompt && !prompt.trim() && (
                <span className="ml-2 text-muted font-normal">(auto-filled from topic)</span>
              )}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={suggestedPrompt || "Describe the diagram or visual you need…"}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />
            <p className="text-xs text-muted mt-1">
              Be specific: include labels, structure, and style. E.g. "Cross-section of mitochondria with labelled cristae, matrix, and inner membrane"
            </p>
          </div>

          {/* Generate */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={loading || !effectivePrompt}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><RefreshCw size={14} className="animate-spin" /> Generating…</>
              ) : (
                <><ImageIcon size={14} /> Generate</>
              )}
            </button>
            {loading && (
              <span className="text-xs text-muted animate-pulse">This may take 10–30 seconds…</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-danger/5 border border-danger/20 rounded-lg px-3 py-2.5 text-sm text-danger">
              <X size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.assetUrl}
                  alt={`Generated ${TASK_LABELS[task] ?? "visual"}`}
                  className="w-full h-auto max-h-80 object-contain"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {(result.generationTimeMs / 1000).toFixed(1)}s
                  {" · "}{result.modelUsed.split("/").pop()}
                  {result.metadata.width
                    ? ` · ${result.metadata.width}×${result.metadata.height}`
                    : ""}
                  {result.metadata.fileSizeBytes
                    ? ` · ${Math.round(result.metadata.fileSizeBytes / 1024)} KB`
                    : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generate}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-2 hover:bg-surface transition-colors"
                  >
                    <RefreshCw size={11} /> Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
