"use client";

import { useMemo } from "react";
import katex from "katex";

const INLINE_REGEX = /\$([^$]+)\$/g;
const BLOCK_REGEX = /\$\$([^$]+)\$\$/g;

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
    let result = text;
    result = result.replace(BLOCK_REGEX, (_, latex) =>
      renderKatex(latex.trim(), true)
    );
    result = result.replace(INLINE_REGEX, (_, latex) =>
      renderKatex(latex.trim(), false)
    );
    return result;
  }, [text]);

  if (html === text) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
