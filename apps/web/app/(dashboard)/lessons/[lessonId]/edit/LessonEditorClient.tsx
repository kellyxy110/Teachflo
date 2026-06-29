"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Clock, Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Minus, Table2, Sigma, ChevronDown,
  ChevronUp, History, X, Check, RefreshCw, Columns2,
  EyeIcon,
} from "lucide-react";
import { LatexSymbolPalette } from "@/components/exam/LatexSymbolPalette";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";
type AIAction = "expand" | "condense";
type ViewMode = "split" | "write" | "preview";

type VersionEntry = {
  ts: number;
  markdown: string;
  label: string;
};

const MAX_HISTORY = 10;

function storageKey(lessonId: string) {
  return `tf_lesson_hist_${lessonId}`;
}

function loadHistory(lessonId: string): VersionEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(lessonId));
    return raw ? (JSON.parse(raw) as VersionEntry[]) : [];
  } catch {
    return [];
  }
}

function pushHistory(lessonId: string, markdown: string): void {
  try {
    const history = loadHistory(lessonId);
    const entry: VersionEntry = {
      ts: Date.now(),
      markdown,
      label: new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
    };
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(storageKey(lessonId), JSON.stringify(history));
  } catch {
    // localStorage unavailable — skip silently
  }
}

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
        if (line.match(/^\d+\.\s/))
          return <p key={i} className="text-sm text-text mb-1 pl-4">{line}</p>;
        if (line.startsWith("- "))
          return <p key={i} className="text-sm text-text mb-1 pl-4">• {line.slice(2)}</p>;
        if (line.trim())
          return <p key={i} className="text-sm text-text mb-2">{line.replace(/\*\*(.+?)\*\*/g, "**$1**")}</p>;
        return null;
      })}
    </>
  );
}

export function LessonEditorClient({
  lessonId,
  subject,
  classLevel,
  topic,
  initialMarkdown,
}: {
  lessonId: string;
  subject: string;
  classLevel: string;
  topic: string;
  initialMarkdown: string;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [showPalette, setShowPalette] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<VersionEntry[]>([]);
  const [aiAction, setAIAction] = useState<AIAction | null>(null);
  const [aiResult, setAIResult] = useState<string>("");
  const [aiStreaming, setAIStreaming] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  // Load version history on mount
  useEffect(() => {
    setHistory(loadHistory(lessonId));
  }, [lessonId]);

  // Autosave: debounced 1.5 seconds after last change
  const scheduleSave = useCallback(
    (value: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("unsaved");
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const res = await fetch(`/api/lessons/${lessonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markdown: value }),
          });
          if (!res.ok) throw new Error("Save failed");
          setSaveStatus("saved");
          pushHistory(lessonId, value);
          setHistory(loadHistory(lessonId));
        } catch {
          setSaveStatus("error");
        }
      }, 1500);
    },
    [lessonId],
  );

  function handleChange(value: string) {
    setMarkdown(value);
    scheduleSave(value);
  }

  // Toolbar helpers: insert around selection or at cursor
  function wrapSelection(before: string, after = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.slice(start, end);
    const next = markdown.slice(0, start) + before + selected + after + markdown.slice(end);
    setMarkdown(next);
    scheduleSave(next);
    requestAnimationFrame(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
      ta.focus();
    });
  }

  function insertLinePrefix(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lineStart = markdown.lastIndexOf("\n", pos - 1) + 1;
    const current = markdown.slice(lineStart, pos);
    // Toggle off if already prefixed
    if (current.startsWith(prefix)) {
      const next = markdown.slice(0, lineStart) + markdown.slice(lineStart + prefix.length);
      setMarkdown(next);
      scheduleSave(next);
      requestAnimationFrame(() => {
        ta.selectionStart = pos - prefix.length;
        ta.selectionEnd = pos - prefix.length;
        ta.focus();
      });
    } else {
      const next = markdown.slice(0, lineStart) + prefix + markdown.slice(lineStart);
      setMarkdown(next);
      scheduleSave(next);
      requestAnimationFrame(() => {
        ta.selectionStart = pos + prefix.length;
        ta.selectionEnd = pos + prefix.length;
        ta.focus();
      });
    }
  }

  function insertTable() {
    const table = "\n| Column A | Column B | Column C |\n|---|---|---|\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n";
    wrapSelection(table);
  }

  function insertHR() {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const next = markdown.slice(0, pos) + "\n---\n" + markdown.slice(pos);
    setMarkdown(next);
    scheduleSave(next);
    requestAnimationFrame(() => {
      ta.selectionStart = pos + 5;
      ta.selectionEnd = pos + 5;
      ta.focus();
    });
  }

  function insertLatex(latex: string) {
    wrapSelection(`$${latex}$`);
    setShowPalette(false);
  }

  // AI expand / condense
  async function runAIAction(action: AIAction) {
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAIAction(action);
    setAIResult("");
    setAIStreaming(true);

    try {
      const res = await fetch("/api/lessons/edit-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: markdown, action, subject, classLevel }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("AI request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAIResult(full);
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setAIResult("AI action failed. Please try again.");
      }
    } finally {
      setAIStreaming(false);
    }
  }

  function applyAIResult() {
    if (!aiResult) return;
    handleChange(aiResult);
    setAIAction(null);
    setAIResult("");
  }

  function dismissAIResult() {
    aiAbortRef.current?.abort();
    setAIAction(null);
    setAIResult("");
    setAIStreaming(false);
  }

  function restoreVersion(entry: VersionEntry) {
    handleChange(entry.markdown);
    setShowHistory(false);
  }

  const statusColor =
    saveStatus === "saved" ? "text-success" :
    saveStatus === "saving" ? "text-primary" :
    saveStatus === "error" ? "text-danger" :
    "text-text-2";

  const statusLabel =
    saveStatus === "saved" ? "Saved" :
    saveStatus === "saving" ? "Saving..." :
    saveStatus === "error" ? "Save failed" :
    "Unsaved";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/lessons/${lessonId}`}
            className="flex items-center gap-1.5 text-sm text-text-2 hover:text-text transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            Back
          </Link>
          <span className="text-muted text-sm hidden sm:block">|</span>
          <span className="text-sm font-medium text-text truncate hidden sm:block">{topic}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
            {saveStatus === "saving" ? <RefreshCw size={12} className="animate-spin" /> :
             saveStatus === "saved" ? <Check size={12} /> :
             saveStatus === "error" ? <X size={12} /> :
             <Clock size={12} />}
            {statusLabel}
          </span>

          {/* View mode toggle */}
          <div className="flex items-center bg-bg border border-border rounded-lg p-0.5 gap-0.5">
            {([
              { mode: "write" as ViewMode, icon: <Bold size={13} />, label: "Write" },
              { mode: "split" as ViewMode, icon: <Columns2 size={13} />, label: "Split" },
              { mode: "preview" as ViewMode, icon: <EyeIcon size={13} />, label: "Preview" },
            ] as { mode: ViewMode; icon: React.ReactNode; label: string }[]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-primary text-white"
                    : "text-text-2 hover:text-text"
                }`}
              >
                {icon}
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            title="Version history"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-2 hover:bg-bg transition-colors"
          >
            <History size={13} />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-bg shrink-0 flex-wrap">
        <button onClick={() => wrapSelection("**", "**")} title="Bold" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <Bold size={14} />
        </button>
        <button onClick={() => wrapSelection("*", "*")} title="Italic" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <Italic size={14} />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button onClick={() => insertLinePrefix("## ")} title="Heading 2" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <Heading2 size={14} />
        </button>
        <button onClick={() => insertLinePrefix("### ")} title="Heading 3" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <Heading3 size={14} />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button onClick={() => insertLinePrefix("- ")} title="Bullet list" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <List size={14} />
        </button>
        <button onClick={() => insertLinePrefix("1. ")} title="Ordered list" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <ListOrdered size={14} />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button onClick={insertTable} title="Insert table" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <Table2 size={14} />
        </button>
        <button onClick={insertHR} title="Horizontal rule" className="p-1.5 rounded hover:bg-surface text-text-2 hover:text-text transition-colors">
          <Minus size={14} />
        </button>
        <button
          onClick={() => setShowPalette(!showPalette)}
          title="Insert equation (LaTeX)"
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            showPalette ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-surface text-text-2 hover:text-text"
          }`}
        >
          <Sigma size={14} />
          <span className="hidden sm:inline">Equation</span>
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        {/* AI actions */}
        <button
          onClick={() => runAIAction("expand")}
          disabled={aiStreaming}
          title="AI: Expand lesson"
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors disabled:opacity-40"
        >
          <ChevronDown size={14} />
          <span className="hidden sm:inline">Expand</span>
        </button>
        <button
          onClick={() => runAIAction("condense")}
          disabled={aiStreaming}
          title="AI: Condense lesson"
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-40"
        >
          <ChevronUp size={14} />
          <span className="hidden sm:inline">Condense</span>
        </button>
      </div>

      {/* LaTeX palette (inline, collapsible) */}
      {showPalette && (
        <div className="border-b border-border bg-bg shrink-0">
          <LatexSymbolPalette
            onInsert={insertLatex}
            onClose={() => setShowPalette(false)}
          />
        </div>
      )}

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Write pane */}
        {(viewMode === "write" || viewMode === "split") && (
          <div className={`flex flex-col ${viewMode === "split" ? "w-1/2 border-r border-border" : "w-full"}`}>
            <div className="px-3 py-1.5 border-b border-border bg-bg">
              <span className="text-xs text-text-2">Markdown</span>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => handleChange(e.target.value)}
              className="flex-1 resize-none p-4 text-sm text-text bg-surface font-mono leading-relaxed focus:outline-none"
              placeholder="Start writing your lesson plan in markdown..."
              spellCheck
            />
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`flex flex-col ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
            <div className="px-3 py-1.5 border-b border-border bg-bg">
              <span className="text-xs text-text-2">Preview</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {markdown.trim() ? (
                <LessonMarkdown content={markdown} />
              ) : (
                <p className="text-sm text-muted italic">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI result panel */}
      {aiAction && (
        <div className="border-t border-border bg-surface shrink-0 max-h-80 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs font-medium text-text-2">
              {aiStreaming ? (
                <span className="flex items-center gap-1.5 text-primary">
                  <RefreshCw size={12} className="animate-spin" />
                  AI {aiAction === "expand" ? "Expanding" : "Condensing"}...
                </span>
              ) : (
                <span className="text-success flex items-center gap-1.5">
                  <Check size={12} />
                  AI result ready
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {!aiStreaming && aiResult && (
                <button
                  onClick={applyAIResult}
                  className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors"
                >
                  <Save size={11} /> Apply
                </button>
              )}
              <button onClick={dismissAIResult} className="p-1 rounded hover:bg-bg text-text-2 hover:text-text transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {aiResult ? (
              <pre className="text-xs text-text font-mono whitespace-pre-wrap leading-relaxed">{aiResult}</pre>
            ) : (
              <p className="text-xs text-muted">Waiting for AI...</p>
            )}
          </div>
        </div>
      )}

      {/* Version history drawer */}
      {showHistory && (
        <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface border-l border-border shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text">Version History</span>
            <button onClick={() => setShowHistory(false)} className="text-text-2 hover:text-text">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-6 text-center">
                <History size={24} className="text-muted mx-auto mb-2" />
                <p className="text-sm text-text-2">No saved versions yet.</p>
                <p className="text-xs text-muted mt-1">Versions are saved automatically as you write.</p>
              </div>
            ) : (
              history.map((entry, i) => (
                <button
                  key={entry.ts}
                  onClick={() => restoreVersion(entry)}
                  className="w-full text-left px-4 py-3 border-b border-border hover:bg-bg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text">
                      {i === 0 ? "Latest save" : `Version ${history.length - i}`}
                    </span>
                    <span className="text-xs text-muted">{entry.label}</span>
                  </div>
                  <p className="text-xs text-text-2 mt-0.5 truncate">
                    {entry.markdown.slice(0, 80)}...
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
