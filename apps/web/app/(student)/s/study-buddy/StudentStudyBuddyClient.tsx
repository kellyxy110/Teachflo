"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, BookOpen, HelpCircle, ListOrdered, AlertTriangle } from "lucide-react";

type Mode = "explain" | "test" | "hint" | "step-by-step" | "review-mistakes";

const MODES: { id: Mode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "explain", label: "Explain", icon: BookOpen, desc: "Clear explanations with examples" },
  { id: "test", label: "Test Me", icon: Sparkles, desc: "Practice questions on weak areas" },
  { id: "hint", label: "Hint", icon: HelpCircle, desc: "Guided hints, no direct answers" },
  { id: "step-by-step", label: "Step-by-Step", icon: ListOrdered, desc: "Detailed solution walkthrough" },
  { id: "review-mistakes", label: "Review Mistakes", icon: AlertTriangle, desc: "Analyze your recent errors" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Context {
  studentName: string;
  className: string;
  schoolName: string;
  weakSkills: string[];
  recentMistakes: { question: string; skill: string; feedback: string }[];
}

export function StudentStudyBuddyClient({ context }: { context: Context }) {
  const [mode, setMode] = useState<Mode>("explain");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/study-buddy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          mode,
          studentContext: {
            name: context.studentName,
            className: context.className,
            weakSkills: context.weakSkills,
            recentMistakes: context.recentMistakes,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
      {/* Mode selector */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              mode === id
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-text-2 hover:bg-bg border border-transparent"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={32} className="text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-text">Hi {context.studentName}!</p>
            <p className="text-xs text-text-2 mt-1 max-w-sm mx-auto">
              I&apos;m your Study Buddy. Ask me anything about your subjects, or pick a mode above to get started.
            </p>
            {context.weakSkills.length > 0 && (
              <div className="mt-4 text-xs text-text-2">
                <p className="font-semibold mb-1">Areas to work on:</p>
                {context.weakSkills.slice(0, 3).map((s, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[10px] mr-1 mb-1">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-bg text-text border border-border rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-bg border border-border rounded-bl-md">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-border flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask me anything (${mode} mode)...`}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
