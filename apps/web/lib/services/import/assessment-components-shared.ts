export interface AssessmentComponentSuggestion {
  target: "assessmentComponent";
  componentName: string;
  normalizedName: string;
  maxScore?: number;
}

export function normalizeAssessmentComponentName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const COMMON_COMPONENTS: Record<string, { name: string; maxScore?: number }> = {
  ca1: { name: "CA1", maxScore: 15 },
  ca2: { name: "CA2", maxScore: 10 },
  "cl.wk.1": { name: "Classwork 1", maxScore: 2.5 },
  "cl.wk.2": { name: "Classwork 2", maxScore: 2.5 },
  notes: { name: "Notes", maxScore: 5 },
  "hol.asmt": { name: "Holiday Assessment", maxScore: 5 },
};

/** Suggestions only. The mapping UI requires explicit teacher confirmation. */
export function suggestAssessmentComponent(sourceColumn: string): AssessmentComponentSuggestion | null {
  const key = sourceColumn.trim().toLowerCase();
  const known = COMMON_COMPONENTS[key];
  if (known) {
    return {
      target: "assessmentComponent",
      componentName: known.name,
      normalizedName: normalizeAssessmentComponentName(known.name),
      maxScore: known.maxScore,
    };
  }

  if (/^(test|class\s*work|classwork|assignment|project|practical|mid\s*term)([.\s_-]*\d+)?$/i.test(sourceColumn.trim())) {
    const name = sourceColumn.trim().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
    return { target: "assessmentComponent", componentName: name, normalizedName: normalizeAssessmentComponentName(name) };
  }
  return null;
}

export function deterministicImportTarget(sourceColumn: string): string | null {
  const key = sourceColumn.trim().toLowerCase();
  if (/^(#|s\/?n|serial( no\.?| number)?|no\.?|portal id)$/i.test(key)) return "ignore";
  if (/^(student id|student no\.?|admission no\.?|admission number|reg(istration)? no\.?)$/i.test(key)) return "regNumber";
  if (/^(student name|full name|name)$/i.test(key)) return "fullName";
  if (/^(exam|examination)$/i.test(key)) return "exam";
  if (/^(tavg|total|total score|aggregate|overall)$/i.test(key)) return "total";
  if (/^grade$/i.test(key)) return "grade";
  return suggestAssessmentComponent(sourceColumn)?.target ?? null;
}

export function parseTabularMatrix(matrix: unknown[][]): { headers: string[]; rows: Record<string, string>[] } {
  const candidates = matrix.slice(0, 20).map((row, index) => {
    const headers = row.map((value) => String(value ?? "").trim());
    const mapped = headers.filter((header) => header && deterministicImportTarget(header) !== null).length;
    const hasName = headers.some((header) => deterministicImportTarget(header) === "fullName") ||
      (headers.some((header) => deterministicImportTarget(header) === "firstName") && headers.some((header) => deterministicImportTarget(header) === "lastName"));
    return { index, headers, score: mapped + (hasName ? 5 : 0) };
  });
  const headerRow = candidates.sort((a, b) => b.score - a.score)[0];
  if (!headerRow || headerRow.score < 7) return { headers: [], rows: [] };

  const headers = headerRow.headers.map((header, index) => header || `Column ${index + 1}`);
  const rows = matrix.slice(headerRow.index + 1)
    .filter((row) => row.some((value) => String(value ?? "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])));
  return { headers, rows };
}
