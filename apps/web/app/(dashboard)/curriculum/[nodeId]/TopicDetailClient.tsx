"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import type { TopicContext } from "@/lib/curriculum-graph";
import {
  ArrowLeft, BookOpen, Target, Link2, Globe,
  Lightbulb, AlertTriangle, FlaskConical, ChevronRight,
  Zap, FileQuestion, Layers, Loader2, X, Copy, Check,
} from "lucide-react";

const BLOOM_COLOR: Record<string, string> = {
  Remember:    "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
  Understand:  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  Apply:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Analyse:     "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  Evaluate:    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Create:      "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
};

const EXAM_COLOR: Record<string, string> = {
  WAEC: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  NECO: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  JAMB: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
};

const DIFFICULTY_COLOR = {
  EASY:   "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  MEDIUM: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  HARD:   "text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
};

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <h2 className="text-sm font-bold text-text uppercase tracking-wide">{children}</h2>
    </div>
  );
}

function NodeChip({ label, id }: { label: string; id: string }) {
  return (
    <Link
      href={`/curriculum/${id}`}
      className="flex items-center gap-1.5 px-3 py-2 bg-bg border border-border rounded-lg hover:border-primary/40 hover:text-primary text-sm text-text-2 transition-colors group"
    >
      <span className="flex-1 leading-snug">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

function GenerateCTA({ icon: Icon, label, description, onClick, active }: {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all text-left group w-full"
      style={active ? { borderColor: "var(--color-primary)", background: "var(--color-primary-bg, rgba(59,130,246,0.06))" } : undefined}
    >
      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 text-primary${active ? " animate-spin" : ""}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted mt-0.5 leading-snug">{description}</p>
      </div>
    </button>
  );
}

function LessonMarkdown({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-bold text-text mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold text-text mt-4 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-text-2 mt-3 mb-1">{line.slice(5)}</h4>);
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(<p key={i} className="text-sm font-semibold text-text mb-1">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="border-border my-3" />);
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<p key={i} className="text-sm text-text mb-1 pl-4">{line}</p>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(<p key={i} className="text-sm text-text mb-1 pl-4">• {line.slice(2)}</p>);
    } else if (line.trim()) {
      elements.push(<p key={i} className="text-sm text-text-2 mb-1.5 leading-relaxed">{line}</p>);
    }
  }
  return <div className="space-y-0.5">{elements}</div>;
}

type GenType = "lesson" | "quiz" | "flashcards";

const GEN_LABELS: Record<GenType, string> = {
  lesson: "Lesson Plan",
  quiz: "Quiz",
  flashcards: "Flashcards",
};

export function TopicDetailClient({ context }: { context: TopicContext }) {
  const router = useRouter();
  const { node, prerequisites, learningObjectives, relatedConcepts, crossSubjectConnections } = context;

  const [generating, setGenerating] = useState<GenType | null>(null);
  const [output, setOutput] = useState("");
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (type: GenType) => {
    if (generating) {
      abortRef.current?.abort();
      setGenerating(null);
      return;
    }
    setGenerating(type);
    setOutput("");
    setGenError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/cig/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, type }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        setGenError(err.error ?? "Generation failed");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setGenError("No response stream"); return; }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setGenError((e as Error).message ?? "Generation failed");
      }
    } finally {
      setGenerating(null);
    }
  }, [generating, node.id]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <div className="space-y-6 pb-10">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Topic header */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {(node.subject || node.classLevel) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {node.subject && (
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {node.subject}
                  </span>
                )}
                {node.classLevel && (
                  <span className="text-[11px] text-muted font-medium">
                    {node.classLevel.replace("JS", "JSS")}
                    {node.term ? ` · ${node.term.toLowerCase()} term` : ""}
                    {node.week ? ` · week ${node.week}` : ""}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-xl font-bold text-text leading-snug">{node.label}</h1>
          </div>
          {node.difficulty && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${DIFFICULTY_COLOR[node.difficulty]}`}>
              {node.difficulty.charAt(0) + node.difficulty.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {node.description && (
          <p className="text-sm text-text-2 leading-relaxed">{node.description}</p>
        )}

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2">
          {context.bloomLevels.map((b) => (
            <span key={b} className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${BLOOM_COLOR[b] ?? "bg-border text-muted"}`}>
              {b}
            </span>
          ))}
          {context.examStandards.map((s) => (
            <span key={s} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${EXAM_COLOR[s] ?? "bg-border text-muted"}`}>
              {s}
            </span>
          ))}
          {node.estimatedMinutes && (
            <span className="text-xs text-muted">~{node.estimatedMinutes} min</span>
          )}
        </div>
      </div>

      {/* Generate CTAs */}
      <div>
        <SectionHeading icon={Zap}>Generate with AI</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GenerateCTA
            icon={generating === "lesson" ? Loader2 : BookOpen}
            label={generating === "lesson" ? "Generating…" : "Lesson Plan"}
            description="Full lesson with activities and timing"
            onClick={() => generate("lesson")}
            active={generating === "lesson"}
          />
          <GenerateCTA
            icon={generating === "quiz" ? Loader2 : FileQuestion}
            label={generating === "quiz" ? "Generating…" : "Quiz"}
            description="WAEC/NECO style questions with marking scheme"
            onClick={() => generate("quiz")}
            active={generating === "quiz"}
          />
          <GenerateCTA
            icon={generating === "flashcards" ? Loader2 : Layers}
            label={generating === "flashcards" ? "Generating…" : "Flashcards"}
            description="Spaced repetition cards for this topic"
            onClick={() => generate("flashcards")}
            active={generating === "flashcards"}
          />
        </div>

        {/* Streaming output panel */}
        {(output || generating || genError) && (
          <div className="mt-4 border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
              <div className="flex items-center gap-2">
                {generating && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                <span className="text-xs font-bold text-text-2 uppercase tracking-wide">
                  {generating ? `Generating ${GEN_LABELS[generating]}…` : genError ? "Error" : "Generated"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {output && !generating && (
                  <button
                    onClick={copyOutput}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:border-primary/40 text-text-2 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
                <button
                  onClick={() => { abortRef.current?.abort(); setGenerating(null); setOutput(""); setGenError(null); }}
                  className="p-1 rounded-md hover:bg-border/60 text-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-surface max-h-[600px] overflow-y-auto">
              {genError ? (
                <p className="text-sm text-danger">{genError}</p>
              ) : (
                <LessonMarkdown content={output} />
              )}
              {generating && !output && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting generation…
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Learning objectives */}
      {learningObjectives.length > 0 && (
        <div>
          <SectionHeading icon={Target}>Learning Objectives</SectionHeading>
          <ul className="space-y-2">
            {learningObjectives.map((obj) => (
              <li key={obj.id} className="flex items-start gap-2.5 text-sm text-text-2 leading-snug">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {obj.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Formulae */}
      {context.formulae && Object.keys(context.formulae).length > 0 && (
        <div>
          <SectionHeading icon={FlaskConical}>Key Formulae</SectionHeading>
          <div className="space-y-2">
            {Object.entries(context.formulae).map(([name, formula]) => (
              <div key={name} className="flex items-start gap-3 p-3 bg-bg border border-border rounded-lg">
                <div className="text-xs font-semibold text-muted w-32 shrink-0 pt-0.5">{name}</div>
                <code className="text-sm font-mono text-text leading-snug break-all">{formula}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Misconceptions */}
      {context.misconceptions.length > 0 && (
        <div>
          <SectionHeading icon={AlertTriangle}>Common Misconceptions</SectionHeading>
          <ul className="space-y-2">
            {context.misconceptions.map((m, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-sm text-amber-800 dark:text-amber-300 leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <div>
          <SectionHeading icon={Link2}>Prerequisites</SectionHeading>
          <div className="space-y-2">
            {prerequisites.map((p) => (
              <NodeChip key={p.id} id={p.id} label={p.label} />
            ))}
          </div>
        </div>
      )}

      {/* Related concepts */}
      {relatedConcepts.length > 0 && (
        <div>
          <SectionHeading icon={Lightbulb}>Related Concepts</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relatedConcepts.map((rc) => (
              <NodeChip key={rc.id} id={rc.id} label={rc.label} />
            ))}
          </div>
        </div>
      )}

      {/* Cross-subject connections */}
      {crossSubjectConnections.length > 0 && (
        <div>
          <SectionHeading icon={Globe}>Cross-Subject Connections</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {crossSubjectConnections.map(({ node: n, subject }) => (
              <Link
                key={n.id}
                href={`/curriculum/${n.id}`}
                className="flex items-start gap-3 p-3 bg-bg border border-border rounded-lg hover:border-primary/40 transition-colors group"
              >
                <div className="shrink-0">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {subject}
                  </span>
                </div>
                <span className="text-sm text-text-2 group-hover:text-text transition-colors leading-snug flex-1">
                  {n.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
