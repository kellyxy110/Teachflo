"use client";

import { useMemo } from "react";
import katex from "katex";

const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return latex;
  }
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => {
    if (!text || !text.includes("$")) return null;
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MATH_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(escapeHtml(text.slice(lastIndex, match.index)));
      parts.push(renderKatex((match[1] ?? match[2]).trim(), Boolean(match[1])));
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(escapeHtml(text.slice(lastIndex)));
    return parts.join("");
  }, [text]);

  if (html === null) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
