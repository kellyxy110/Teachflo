"use client";

import { Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  function handleSubmit() {
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue("");
  }

  return (
    <div className="flex items-end gap-2 bg-surface border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder || "Ask your study buddy anything..."}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-text placeholder:text-muted focus:outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0 p-2 rounded-lg bg-primary text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  );
}
