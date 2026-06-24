"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Copy, Save, RefreshCw, Check } from "lucide-react";
import { saveLesson } from "@/app/actions/lessons";
import type { ClassLevel } from "@prisma/client";

const CLASS_LEVELS: ClassLevel[] = ["JS1","JS2","JS3","SS1","SS2","SS3"];
const TERMS = ["FIRST","SECOND","THIRD"] as const;
const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Agricultural Science","Economics","Government","Literature in English",
  "Geography","History","Civic Education","Christian Religious Studies",
  "Islamic Studies","Further Mathematics","Technical Drawing",
  "Food and Nutrition","Computer Studies","French",
];

type Phase = "idle" | "generating" | "done" | "saving";

export function LessonGeneratorClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [markdown, setMarkdown] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const [form, setForm] = useState({
    subject: "",
    classLevel: "" as ClassLevel | "",
    topic: "",
    week: "",
    term: "FIRST",
    periods: "1",
  });

  async function generate() {
    if (!form.subject || !form.classLevel || !form.topic) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPhase("generating");
    setMarkdown("");

    try {
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          classLevel: form.classLevel,
          topic: form.topic,
          week: form.week ? parseInt(form.week) : null,
          term: form.term,
          periods: form.periods ? parseInt(form.periods) : 1,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setMarkdown(full);
      }

      setPhase("done");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setPhase("idle");
        alert("Generation failed. Please try again — the AI service may be temporarily unavailable.");
      }
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    if (!form.subject || !form.classLevel || !form.topic || !markdown) return;
    setPhase("saving");
    startTransition(async () => {
      const id = await saveLesson({
        subject: form.subject,
        classLevel: form.classLevel as ClassLevel,
        topic: form.topic,
        week: form.week ? parseInt(form.week) : undefined,
        term: form.term,
        markdown,
      });
      router.push(`/lessons/${id}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="font-semibold text-text mb-4">Lesson Details</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-2 mb-1">Subject *</label>
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            >
              <option value="">Select...</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Class *</label>
            <select
              value={form.classLevel}
              onChange={(e) => setForm((f) => ({ ...f, classLevel: e.target.value as ClassLevel }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            >
              <option value="">Select...</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Term</label>
            <select
              value={form.term}
              onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} Term</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Week</label>
            <input
              type="number"
              min={1}
              max={13}
              value={form.week}
              onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))}
              placeholder="e.g. 3"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Periods</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.periods}
              onChange={(e) => setForm((f) => ({ ...f, periods: e.target.value }))}
              placeholder="e.g. 8"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-text-2 mb-1">Topic *</label>
          <input
            type="text"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. Electromagnetic Induction, Quadratic Equations, Photosynthesis..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={generate}
            disabled={!form.subject || !form.classLevel || !form.topic || phase === "generating" || phase === "saving"}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "generating" ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate Lesson Plan
              </>
            )}
          </button>

          {phase === "generating" && (
            <button
              onClick={() => { abortRef.current?.abort(); setPhase("idle"); }}
              className="px-4 py-2.5 border border-border rounded-lg text-sm text-text-2 hover:bg-bg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Output */}
      {(phase === "generating" || phase === "done" || phase === "saving") && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg">
            <div className="flex items-center gap-2">
              {phase === "generating" && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Writing your lesson plan...
                </span>
              )}
              {(phase === "done" || phase === "saving") && (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <Check size={13} />
                  Lesson plan ready
                </span>
              )}
            </div>

            {(phase === "done" || phase === "saving") && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-2 hover:bg-surface transition-colors"
                >
                  {copied ? <><Check size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
                <button
                  onClick={generate}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-2 hover:bg-surface transition-colors"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
                <button
                  onClick={handleSave}
                  disabled={phase === "saving" || isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  <Save size={12} />
                  {phase === "saving" ? "Saving..." : "Save Lesson"}
                </button>
              </div>
            )}
          </div>

          {/* Rendered markdown */}
          <div className="p-6 prose prose-sm max-w-none text-text leading-relaxed">
            <LessonMarkdown content={markdown} />
          </div>
        </div>
      )}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

function LessonMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold text-text mt-6 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold text-text mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-text-2 mt-4 mb-1">{line.slice(5)}</h4>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="border-border my-4" />);
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(<p key={i} className="text-sm text-text mb-1 pl-4">{renderInline(line)}</p>);
    } else if (line.startsWith("- ")) {
      elements.push(<p key={i} className="text-sm text-text mb-1 pl-4">• {renderInline(line.slice(2))}</p>);
    } else if (line.trim()) {
      elements.push(<p key={i} className="text-sm text-text mb-2">{renderInline(line)}</p>);
    }
  }

  return <>{elements}</>;
}
