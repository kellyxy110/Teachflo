"use client";

import { useMemo } from "react";
import katex from "katex";

const LATEX_SHORTCUTS = [
  { label: "x²", insert: "x^{2}" },
  { label: "√", insert: "\\sqrt{}" },
  { label: "∑", insert: "\\sum_{i=1}^{n}" },
  { label: "∫", insert: "\\int_{a}^{b}" },
  { label: "frac", insert: "\\frac{a}{b}" },
  { label: "±", insert: "\\pm" },
  { label: "≤", insert: "\\leq" },
  { label: "≥", insert: "\\geq" },
  { label: "≠", insert: "\\neq" },
  { label: "∞", insert: "\\infty" },
  { label: "π", insert: "\\pi" },
  { label: "θ", insert: "\\theta" },
  { label: "α", insert: "\\alpha" },
  { label: "β", insert: "\\beta" },
  { label: "→", insert: "\\rightarrow" },
  { label: "H₂O", insert: "H_2O" },
  { label: "CO₂", insert: "CO_2" },
  { label: "°C", insert: "^{\\circ}C" },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMixed(text: string): string {
  if (!text) return "";
  const parts: string[] = [];
  let lastIndex = 0;
  const regex = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }
    const latex = match[1] ?? match[2];
    const displayMode = !!match[1];
    try {
      parts.push(katex.renderToString(latex, { displayMode, throwOnError: false }));
    } catch {
      parts.push(`<span class="text-danger text-xs">[LaTeX error]</span>`);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }
  return parts.join("");
}

export function KaTeXPreview({ text }: { text: string }) {
  const html = useMemo(() => renderMixed(text), [text]);

  if (!text) return null;

  const hasLatex = text.includes("$");

  if (!hasLatex) return null;

  return (
    <div className="bg-bg border border-border rounded-lg px-3 py-2 mt-1.5">
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Preview</p>
      <div
        className="text-sm text-text leading-relaxed prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function LaTeXToolbar({ onInsert }: { onInsert: (latex: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className="text-[10px] font-bold text-muted mr-1 self-center">LaTeX:</span>
      {LATEX_SHORTCUTS.map(({ label, insert }) => (
        <button
          key={insert}
          type="button"
          onClick={() => onInsert(`$${insert}$`)}
          title={`Insert ${insert}`}
          className="px-1.5 py-0.5 text-[11px] font-mono bg-bg border border-border rounded hover:bg-border/30 hover:border-primary/30 text-text-2 transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
