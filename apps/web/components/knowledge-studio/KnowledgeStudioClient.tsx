"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText, Send, BookOpen, Brain, Zap, List, Sparkles,
  ChevronRight, Loader2, AlertCircle, CheckCircle, GraduationCap,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Upload, Search,
} from "lucide-react";
import { DocumentUploadInline } from "./DocumentUploadInline";

// ── Types ───────────────────────────────────────────────────────────

interface StudioDoc {
  id: string;
  title: string;
  subject: string;
  classLevel: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  chunkCount: number;
  createdAt: Date;
}

type StudioMode = "explain" | "summarize" | "quiz-me" | "step-by-step" | "compare";

interface ChunkCitation {
  id: string;
  documentId: string;
  chunkIndex: number;
  similarity: number;
  preview: string;
  metadata: Record<string, unknown> | null;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: StudioMode;
  citations?: ChunkCitation[];
  model?: string;
  provider?: string;
}

interface DocAnalysis {
  topics?: string[];
  concepts?: Array<{ name: string; definition: string }>;
  difficulty?: string;
  subjectArea?: string;
  classLevelEstimate?: string;
  examRelevance?: string[];
  coverage?: string;
  chunkCount?: number;
}

// ── Mode Config ─────────────────────────────────────────────────────

const MODES: Array<{ id: StudioMode; label: string; icon: React.ElementType; desc: string }> = [
  { id: "explain", label: "Explain", icon: BookOpen, desc: "Get explanations grounded in your documents" },
  { id: "summarize", label: "Summarize", icon: List, desc: "Structured summaries with citations" },
  { id: "quiz-me", label: "Quiz Me", icon: GraduationCap, desc: "Generate quizzes from your materials" },
  { id: "step-by-step", label: "Step by Step", icon: Zap, desc: "Break down concepts step by step" },
  { id: "compare", label: "Compare", icon: Search, desc: "Compare content across documents" },
];

// ── Main Component ──────────────────────────────────────────────────

export function KnowledgeStudioClient({
  documents: initialDocs,
  subjects,
}: {
  documents: StudioDoc[];
  subjects: string[];
}) {
  const [documents, setDocuments] = useState(initialDocs);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<StudioMode>("explain");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [analysis, setAnalysis] = useState<DocAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const analyzeDocument = useCallback(async (docId: string) => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/knowledge-studio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch { /* non-fatal */ }
    setAnalyzing(false);
  }, []);

  useEffect(() => {
    if (selectedIds.length === 1) {
      analyzeDocument(selectedIds[0]);
    } else {
      setAnalysis(null);
    }
  }, [selectedIds, analyzeDocument]);

  function toggleDoc(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    const msg = input.trim();
    if (!msg || streaming || selectedIds.length === 0) return;

    setInput("");
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      timestamp: new Date(),
      mode,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMsg = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      mode,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch("/api/knowledge-studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, documentIds: selectedIds, mode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${err.error}` } : m
          )
        );
        setStreaming(false);
        return;
      }

      let citations: ChunkCitation[] = [];
      try {
        const chunksHeader = res.headers.get("X-KS-Chunks");
        if (chunksHeader) citations = JSON.parse(chunksHeader);
      } catch { /* ok */ }

      const model = res.headers.get("X-KS-Model") || undefined;
      const provider = res.headers.get("X-KS-Provider") || undefined;

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
          const snapshot = fullContent;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: snapshot, citations, model, provider }
                : m
            )
          );
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Connection lost. Please try again." } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  async function handleGenerate(type: string) {
    if (selectedIds.length !== 1 || generating) return;
    setGenerating(type);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: `Generate ${type} from this document`,
        timestamp: new Date(),
      },
      {
        id: assistantId,
        role: "assistant" as const,
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const res = await fetch("/api/knowledge-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedIds[0], type }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${err.error}` } : m
          )
        );
        setGenerating(null);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          const snap = full;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m))
          );
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Generation failed." } : m
        )
      );
    } finally {
      setGenerating(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const selectedDocs = documents.filter((d) => selectedIds.includes(d.id));

  return (
    <div className="flex h-full gap-0 bg-bg">
      {/* ── LEFT: Document List ─────────────────────────── */}
      <div
        className={`border-r border-border bg-surface flex flex-col transition-all ${
          leftOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        {leftOpen && (
          <>
            <div className="px-3 py-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-2">
                  Documents
                </h3>
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className="p-1 rounded-md hover:bg-bg text-muted hover:text-primary transition-colors"
                  title="Upload document"
                >
                  <Upload size={14} />
                </button>
              </div>
              {selectedIds.length > 0 && (
                <p className="text-[10px] text-primary font-medium">
                  {selectedIds.length} selected
                </p>
              )}
            </div>

            {showUpload && (
              <div className="p-3 border-b border-border">
                <DocumentUploadInline
                  subjects={subjects}
                  onUploaded={(doc) => {
                    setDocuments((prev) => [doc, ...prev]);
                    setShowUpload(false);
                  }}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <FileText size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No documents yet</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Upload a PDF
                  </button>
                </div>
              ) : (
                documents.map((doc) => {
                  const selected = selectedIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDoc(doc.id)}
                      className={`w-full text-left rounded-lg p-2.5 transition-colors ${
                        selected
                          ? "bg-primary-50 border border-primary/30"
                          : "hover:bg-bg border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 p-1 rounded ${selected ? "bg-primary/10" : "bg-bg"}`}>
                          <FileText size={12} className={selected ? "text-primary" : "text-muted"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${selected ? "text-primary" : "text-text"}`}>
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                            <span>{doc.subject}</span>
                            {doc.classLevel && <span>{doc.classLevel}</span>}
                            <span>{doc.chunkCount} chunks</span>
                          </div>
                        </div>
                        {selected && <CheckCircle size={12} className="text-primary mt-1 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── CENTER: Chat Interface ──────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: mode selector + panel toggles */}
        <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center gap-3">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-text transition-colors"
          >
            {leftOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </button>

          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "text-text-2 hover:bg-bg hover:text-text"
                  }`}
                  title={m.desc}
                >
                  <Icon size={12} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-text transition-colors"
          >
            {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>

        {/* Selected docs bar */}
        {selectedDocs.length > 0 && (
          <div className="px-4 py-1.5 border-b border-border bg-bg/50 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] text-muted shrink-0">Context:</span>
            {selectedDocs.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary font-medium"
              >
                <FileText size={9} />
                {d.title.length > 25 ? d.title.slice(0, 25) + "…" : d.title}
              </span>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                <Brain size={28} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-1">Knowledge Studio</h3>
              <p className="text-sm text-muted max-w-md">
                {selectedIds.length === 0
                  ? "Select documents from the left panel to start. All AI responses will be grounded in your uploaded materials."
                  : "Ask questions about your documents. Every answer is grounded in your uploaded content with source citations."}
              </p>

              {selectedIds.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
                  {[
                    { type: "summary", label: "Summary", icon: List },
                    { type: "concepts", label: "Key Concepts", icon: Brain },
                    { type: "flashcards", label: "Flashcards", icon: Zap },
                    { type: "exam-questions", label: "Exam Questions", icon: GraduationCap },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => handleGenerate(type)}
                      disabled={!!generating || selectedIds.length !== 1}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface text-left hover:border-primary/30 hover:bg-primary-50/50 transition-colors disabled:opacity-40"
                    >
                      <Icon size={14} className="text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-text">Generate {label}</p>
                        <p className="text-[10px] text-muted">From document</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain size={14} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-surface border border-border"
                }`}
              >
                {msg.role === "assistant" && msg.content === "" ? (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                )}

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1.5">Sources</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.citations.map((c, i) => (
                        <span
                          key={c.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-2"
                          title={c.preview}
                        >
                          Chunk {i + 1} · {Math.round(c.similarity * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {msg.model && (
                  <p className="text-[9px] text-muted mt-2 opacity-60">
                    {msg.provider} · {msg.model.split("/").pop()?.replace(":free", "")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-surface">
          {selectedIds.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted text-center justify-center py-2">
              <AlertCircle size={14} />
              Select at least one document to start chatting
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about your documents (${MODES.find((m) => m.id === mode)?.label} mode)...`}
                disabled={streaming}
                rows={1}
                className="flex-1 resize-none px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-bg disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          )}
          <p className="text-[9px] text-muted mt-1.5 text-center">
            All responses are grounded in your uploaded documents. No external knowledge is used.
          </p>
        </div>
      </div>

      {/* ── RIGHT: Intelligence Panel ──────────────────── */}
      <div
        className={`border-l border-border bg-surface flex flex-col transition-all ${
          rightOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        {rightOpen && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              Document Intelligence
            </h3>

            {selectedIds.length === 0 ? (
              <p className="text-xs text-muted">Select a document to see analysis.</p>
            ) : analyzing ? (
              <div className="flex items-center gap-2 text-xs text-muted py-4">
                <Loader2 size={14} className="animate-spin" />
                Analyzing document...
              </div>
            ) : analysis ? (
              <>
                {analysis.subjectArea && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1">Subject</p>
                    <p className="text-sm font-semibold text-text">{analysis.subjectArea}</p>
                  </div>
                )}

                {analysis.difficulty && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1">Difficulty</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      analysis.difficulty === "Basic" ? "bg-green-50 text-green-700" :
                      analysis.difficulty === "Intermediate" ? "bg-yellow-50 text-yellow-700" :
                      analysis.difficulty === "Advanced" ? "bg-red-50 text-red-700" :
                      "bg-blue-50 text-blue-700"
                    }`}>
                      {analysis.difficulty}
                    </span>
                    {analysis.classLevelEstimate && (
                      <span className="text-xs text-muted ml-2">{analysis.classLevelEstimate}</span>
                    )}
                  </div>
                )}

                {analysis.topics && analysis.topics.length > 0 && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1.5">Topics Detected</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.topics.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.concepts && analysis.concepts.length > 0 && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1.5">Key Concepts</p>
                    <div className="space-y-2">
                      {analysis.concepts.slice(0, 8).map((c, i) => (
                        <div key={i}>
                          <p className="text-xs font-semibold text-text">{c.name}</p>
                          <p className="text-[10px] text-muted leading-snug">{c.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.examRelevance && analysis.examRelevance.length > 0 && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1.5">Exam Alignment</p>
                    <div className="flex gap-1">
                      {analysis.examRelevance.map((e, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.coverage && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1">Coverage</p>
                    <p className="text-xs text-text-2 leading-relaxed">{analysis.coverage}</p>
                  </div>
                )}

                {analysis.chunkCount && (
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase text-muted mb-1">Data</p>
                    <p className="text-xs text-text-2">{analysis.chunkCount} chunks indexed</p>
                  </div>
                )}
              </>
            ) : selectedIds.length === 1 ? (
              <p className="text-xs text-muted">Analysis will appear here.</p>
            ) : (
              <p className="text-xs text-muted">Select a single document for detailed analysis. Multiple documents can be used for comparison.</p>
            )}

            {/* Quick generate buttons */}
            {selectedIds.length === 1 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-muted">Quick Generate</p>
                {["summary", "concepts", "flashcards", "exam-questions"].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGenerate(type)}
                    disabled={!!generating}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-2 hover:bg-bg hover:text-text transition-colors disabled:opacity-40"
                  >
                    {generating === type ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    {type.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
