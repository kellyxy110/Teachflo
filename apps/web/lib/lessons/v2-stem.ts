import type { LessonStem, StemInput } from "./v2-contract";

const LATEX = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\(?:frac|sqrt|sin|cos|tan|theta|alpha|beta|gamma|[A-Za-z]+)(?:\{[^}]*\})?)/g;
const UNICODE_MATH = /[∑∫√∞≤≥≠±×÷→←∈∂ΔΩα-ω₀-₉⁰-⁹]/;
export function deriveStemDeterministically(input: StemInput, teachingContent = ""): LessonStem {
  const warnings = [...(input.warnings ?? [])]; let source = input.sourceRepresentation ?? "";
  if (!source && input.origin === "AI_GENERATED") { const matches = teachingContent.match(LATEX) ?? []; const unicode = teachingContent.split(/\s+/).filter((token) => UNICODE_MATH.test(token)); source = [...new Set([...matches, ...unicode])].join("\n"); if (!source) warnings.push("No deterministic STEM expression found in generated content"); }
  if (!source && input.origin === "AI_GROUNDED_IN_SOURCE") warnings.push("Generated STEM requires separate source evidence; no source representation supplied");
  return { sourceRepresentation: source, renderedRepresentation: source || undefined, conversionWarnings: warnings };
}
