"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ModeSelector, type LearningMode } from "./ModeSelector";
import { ChatMessage, type ChatMsg, type MessageMeta } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ContextPanel } from "./ContextPanel";
import { StudentSelector } from "./StudentSelector";
import { getStudentContext, type StudentContext } from "@/app/actions/study-buddy";
import { PanelRightOpen, PanelRightClose, Sparkles, BookOpen } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  class: { name: string; level: string };
}

interface Props {
  students: Student[];
}

export function StudyBuddyClient({ students }: Props) {
  const [mode, setMode] = useState<LearningMode>("explain");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentCtx, setStudentCtx] = useState<StudentContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    topicsCovered: [] as string[],
    questionsAnswered: 0,
    correctAnswers: 0,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadStudentContext = useCallback(async (studentId: string) => {
    setCtxLoading(true);
    try {
      const ctx = await getStudentContext(studentId);
      setStudentCtx(ctx);
    } catch {
      setStudentCtx(null);
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentContext(selectedStudentId);
    } else {
      setStudentCtx(null);
    }
  }, [selectedStudentId, loadStudentContext]);

  function buildSkillContextString(): string {
    if (!studentCtx) return "";
    if (studentCtx.skills.length === 0) return "";
    return studentCtx.skills
      .map((s) => `${s.topic || s.skill}: ${s.percentage}% (${s.correct}/${s.total})`)
      .join("\n");
  }

  function buildWeakSkillsString(): string {
    if (!studentCtx) return "";
    if (studentCtx.weakSkills.length === 0) return "";
    return studentCtx.weakSkills
      .map((s) => `${s.topic || s.skill}: ${s.percentage}%`)
      .join("\n");
  }

  function buildRecentMistakesString(): string {
    if (!studentCtx) return "";
    if (studentCtx.recentMistakes.length === 0) return "";
    return studentCtx.recentMistakes
      .slice(0, 5)
      .map(
        (m) =>
          `Q: ${m.questionStem?.slice(0, 100)}... | Chose: ${m.selectedOption || "—"} | Correct: ${m.correctOption || "—"}${m.misconception ? ` | Misconception: ${m.misconception}` : ""}`
      )
      .join("\n");
  }

  async function handleSend(message: string) {
    if (streaming) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMsg = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/study-buddy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          studentId: selectedStudentId,
          mode,
          skillContext: buildSkillContextString(),
          weakSkills: buildWeakSkillsString(),
          recentMistakes: buildRecentMistakesString(),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.error || "Something went wrong"}` }
              : m
          )
        );
        setStreaming(false);
        return;
      }

      const meta: MessageMeta = {
        model: res.headers.get("X-AI-Model") || undefined,
        provider: res.headers.get("X-AI-Provider") || undefined,
        intent: res.headers.get("X-AI-Intent") || undefined,
        reason: res.headers.get("X-AI-Reason") || undefined,
        ragUsed: res.headers.get("X-AI-RAG-Used") === "true",
        ragChunks: Number(res.headers.get("X-AI-RAG-Chunks")) || undefined,
        learningMode: res.headers.get("X-AI-Learning-Mode") || undefined,
      };

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          const snapshot = fullContent;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: snapshot, meta } : m
            )
          );
        }
      }

      // Extract topics from the conversation for session stats
      const words = message.toLowerCase().split(/\s+/);
      const topicKeywords = words.filter((w) => w.length > 4).slice(0, 2);
      if (topicKeywords.length > 0) {
        setSessionStats((prev) => ({
          ...prev,
          topicsCovered: [...new Set([...prev.topicsCovered, ...topicKeywords])].slice(0, 10),
        }));
      }

      if (mode === "test") {
        setSessionStats((prev) => ({
          ...prev,
          questionsAnswered: prev.questionsAnswered + 1,
        }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Connection lost. Please try again." }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const modeLabels: Record<LearningMode, string> = {
    explain: "What would you like me to explain?",
    test: "What topic should I test you on?",
    hint: "What are you trying to figure out?",
    "step-by-step": "What problem should I solve step by step?",
    "review-mistakes": "Which subject's mistakes should we review?",
  };

  return (
    <div className="flex h-full gap-0">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode selector bar */}
        <div className="px-4 py-3 border-b border-border bg-surface">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-text">Study Buddy</h2>
            </div>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-text transition-colors lg:hidden"
            >
              {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
          <ModeSelector active={mode} onChange={setMode} />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                <BookOpen size={28} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-1">
                Welcome to Study Buddy
              </h3>
              <p className="text-sm text-muted max-w-sm">
                {selectedStudentId
                  ? "Ask questions, take practice tests, or review mistakes. I adapt to your learning profile."
                  : "Select a student from the sidebar to begin a personalized learning session."}
              </p>
              {studentCtx && studentCtx.recommendedTopics.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <p className="w-full text-xs text-muted mb-1">Try asking about:</p>
                  {studentCtx.recommendedTopics.slice(0, 3).map((t, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(`Explain ${t} in simple terms`)}
                      className="px-3 py-1.5 text-xs bg-primary-50 text-primary rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}

          {streaming && messages.length > 0 && messages[messages.length - 1].content === "" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-surface">
          <ChatInput
            onSend={handleSend}
            disabled={streaming}
            placeholder={modeLabels[mode]}
          />
          <p className="text-[10px] text-muted mt-1.5 text-center">
            Study Buddy uses AI to personalize learning. Responses are generated, not sourced from textbooks.
          </p>
        </div>
      </div>

      {/* Right sidebar — context panel */}
      <div
        className={`border-l border-border bg-surface overflow-y-auto transition-all ${
          panelOpen ? "w-72 p-3" : "w-0 p-0 overflow-hidden"
        }`}
      >
        {panelOpen && (
          <div className="space-y-3">
            <StudentSelector
              students={students}
              selectedId={selectedStudentId}
              onSelect={setSelectedStudentId}
            />
            <ContextPanel
              context={studentCtx}
              loading={ctxLoading}
              sessionStats={sessionStats}
            />
          </div>
        )}
      </div>
    </div>
  );
}
