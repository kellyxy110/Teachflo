"use client";

import { Bot, User, Cpu, Database, Zap } from "lucide-react";

export interface MessageMeta {
  model?: string;
  provider?: string;
  intent?: string;
  reason?: string;
  ragUsed?: boolean;
  ragChunks?: number;
  learningMode?: string;
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: MessageMeta;
  timestamp: Date;
}

function MetaBadge({ label, icon: Icon, color }: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

function formatModel(model: string): string {
  const parts = model.split("/");
  const name = parts[parts.length - 1];
  return name.replace(/:free$/, "").replace(/-instruct$/, "");
}

export function ChatMessage({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-primary text-white" : "bg-primary-50 text-primary"
      }`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-surface border border-border text-text rounded-bl-md"
        }`}>
          {msg.content}
        </div>

        {msg.meta && !isUser && (
          <div className="flex flex-wrap gap-1 mt-1.5 px-1">
            {msg.meta.model && (
              <MetaBadge
                label={formatModel(msg.meta.model)}
                icon={Cpu}
                color="bg-primary-50 text-primary"
              />
            )}
            {msg.meta.intent && (
              <MetaBadge
                label={msg.meta.intent}
                icon={Zap}
                color="bg-warning-50 text-warning"
              />
            )}
            {msg.meta.ragUsed && (
              <MetaBadge
                label={`RAG (${msg.meta.ragChunks || 0})`}
                icon={Database}
                color="bg-success-50 text-success"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
