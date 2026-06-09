"use client";

import { useState, useRef } from "react";
import { Copy, Check, RefreshCw, Sparkles } from "lucide-react";

type RewriteMode = "ELI12" | "WAEC" | "JAMB" | "JUPEB";

const MODES: { key: RewriteMode; label: string; description: string }[] = [
  { key: "ELI12", label: "ELI12", description: "Simplified for struggling students" },
  { key: "WAEC", label: "WAEC", description: "WAEC exam standard" },
  { key: "JAMB", label: "JAMB", description: "JAMB MCQ prep focus" },
  { key: "JUPEB", label: "JUPEB", description: "Pre-degree depth" },
];

function LessonMarkdown({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return <h2 key={i} className="text-xl font-bold text-text mt-6 mb-3">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="text-base font-semibold text-text mt-5 mb-2">{line.slice(4)}</h3>;
        if (line.startsWith("#### "))
          return <h4 key={i} className="text-sm font-semibold text-text-2 mt-4 mb-1">{line.slice(5)}</h4>;
        if (line.startsWith("---"))
          return <hr key={i} className="border-border my-4" />;
        if (line.match(/^\*\*(.+)\*\*/))
          return <p key={i} className="text-sm font-semibold text-text mb-1">{line.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
        if (line.match(/^\d+\.\s/))
          return <p key={i} className="text-sm text-text mb-1 pl-4">{line}</p>;
        if (line.startsWith("- "))
          return <p key={i} className="text-sm text-text mb-1 pl-4">• {line.slice(2)}</p>;
        if (line.trim())
          return <p key={i} className="text-sm text-text mb-2">{line}</p>;
        return null;
      })}
    </>
  );
}

export function LessonDetailClient({
  lessonId,
  originalMarkdown,
  subject,
  classLevel,
}: {
  lessonId: string;
  originalMarkdown: string;
  subject: string;
  classLevel: string;
}) {
  const [activeMode, setActiveMode] = useState<"STANDARD" | RewriteMode>("STANDARD");
  const [rewriteCache, setRewriteCache] = useState<Partial<Record<RewriteMode, string>>>({});
  const [generating, setGenerating] = useState<RewriteMode | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const currentContent =
    activeMode === "STANDARD"
      ? originalMarkdown
      : rewriteCache[activeMode] ?? "";

  async function generateRewrite(mode: RewriteMode) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setGenerating(mode);
    setActiveMode(mode);
    setRewriteCache((c) => ({ ...c, [mode]: "" }));

    try {
      const res = await fetch("/api/lessons/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalLesson: originalMarkdown, mode, classLevel, subject }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("Rewrite failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setRewriteCache((c) => ({ ...c, [mode]: full }));
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setGenerating(null);
        alert("Rewrite failed.");
      }
    } finally {
      setGenerating(null);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="bg-surface border border-border rounded-xl p-1 flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveMode("STANDARD")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeMode === "STANDARD"
              ? "bg-primary text-white shadow-sm"
              : "text-text-2 hover:text-text hover:bg-bg"
          }`}
        >
          Standard
        </button>
        {MODES.map(({ key, label, description }) => (
          <button
            key={key}
            onClick={() => {
              if (rewriteCache[key]) {
                setActiveMode(key);
              } else {
                generateRewrite(key);
              }
            }}
            title={description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeMode === key
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:text-text hover:bg-bg"
            }`}
          >
            {generating === key && <RefreshCw size={10} className="animate-spin" />}
            {label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg">
          <span className="text-xs text-text-2">
            {activeMode === "STANDARD" ? "Original lesson plan" : `${activeMode} version`}
            {generating === activeMode && (
              <span className="ml-2 text-primary">• Rewriting...</span>
            )}
          </span>
          <button
            onClick={handleCopy}
            disabled={!currentContent}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-2 hover:bg-surface transition-colors disabled:opacity-40"
          >
            {copied ? <><Check size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>

        <div className="p-6 min-h-[400px]">
          {!currentContent && activeMode !== "STANDARD" ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              {generating === activeMode ? (
                <div className="flex items-center gap-2 text-sm text-text-2">
                  <RefreshCw size={16} className="animate-spin text-primary" />
                  Generating {activeMode} version...
                </div>
              ) : (
                <>
                  <Sparkles size={28} className="text-muted mb-3" />
                  <p className="text-sm text-text-2 mb-3">
                    Rewrite this lesson in {activeMode} style
                  </p>
                  <button
                    onClick={() => generateRewrite(activeMode as RewriteMode)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    <Sparkles size={14} /> Generate {activeMode} Version
                  </button>
                </>
              )}
            </div>
          ) : (
            <LessonMarkdown content={currentContent} />
          )}
        </div>
      </div>
    </div>
  );
}
