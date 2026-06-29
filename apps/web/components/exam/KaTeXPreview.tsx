"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import katex from "katex";
import { Grid3X3 } from "lucide-react";
import { LatexSymbolPalette } from "./LatexSymbolPalette";

const QUICK_SYMBOLS = [
  { label: "x²", insert: "x^{2}" },
  { label: "√", insert: "\\sqrt{}" },
  { label: "∫", insert: "\\int_{a}^{b}" },
  { label: "∑", insert: "\\sum_{i=1}^{n}" },
  { label: "a/b", insert: "\\frac{a}{b}" },
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
  { label: "Δ", insert: "\\Delta" },
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

  if (!text || !text.includes("$")) return null;

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

interface LaTeXToolbarProps {
  onInsert: (latex: string) => void;
}

export function LaTeXToolbar({ onInsert }: LaTeXToolbarProps) {
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPalette) return;
    function handleClickOutside(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPalette(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPalette]);

  return (
    <div className="mt-1.5 space-y-1.5">
      {/* Quick symbols row */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] font-bold text-muted mr-0.5 self-center shrink-0">Quick:</span>
        {QUICK_SYMBOLS.map(({ label, insert }) => (
          <button
            key={insert}
            type="button"
            onClick={() => onInsert(`$${insert}$`)}
            title={`Insert $${insert}$`}
            className="px-1.5 py-0.5 text-[11px] font-mono bg-bg border border-border rounded hover:bg-border/30 hover:border-primary/30 text-text-2 transition-colors"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPalette((v) => !v)}
          className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border transition-colors ml-1 ${
            showPalette
              ? "bg-primary text-white border-primary"
              : "bg-bg border-border text-text-2 hover:border-primary/30"
          }`}
        >
          <Grid3X3 size={11} />
          All Symbols
        </button>
      </div>

      {/* Full palette panel */}
      {showPalette && (
        <div
          ref={paletteRef}
          className="relative z-50 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
        >
          <LatexSymbolPalette
            onInsert={(latex) => {
              onInsert(latex);
            }}
            onClose={() => setShowPalette(false)}
          />
        </div>
      )}
    </div>
  );
}
