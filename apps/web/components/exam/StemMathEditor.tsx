"use client";

import { useRef } from "react";
import { MathText } from "@/components/ui/MathText";
import { LaTeXToolbar } from "@/components/exam/KaTeXPreview";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  id?: string;
};

/** A bounded, source-preserving STEM field. Visual preview is shared with read-only surfaces. */
export function StemMathEditor({ value, onChange, label, placeholder, rows = 6, disabled, id }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(source: string) {
    const element = ref.current;
    if (!element || disabled) return;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${source}${value.slice(end)}`);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + source.length, start + source.length);
    });
  }

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-text">{label}</label>}
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Type prose, then insert an equation…"}
        rows={rows}
        disabled={disabled}
        aria-describedby={id ? `${id}-math-help` : undefined}
        className="w-full resize-y rounded-lg border border-border bg-canvas px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <p id={id ? `${id}-math-help` : undefined} className="text-xs text-muted">
        Equations remain editable source. Use inline <code>$…$</code> or display <code>$$…$$</code> math.
      </p>
      {!disabled && <LaTeXToolbar onInsert={insert} />}
      {value.trim() && (
        <div className="rounded-lg border border-border bg-bg px-3 py-2" aria-label="Rendered equation preview">
          <MathText text={value} className="text-sm leading-relaxed text-text" />
        </div>
      )}
    </div>
  );
}
