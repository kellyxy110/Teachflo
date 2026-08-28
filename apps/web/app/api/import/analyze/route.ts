import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { openRouterCompletion, DOCUMENT_MODELS } from "@/lib/ai";
import { z } from "zod";
import { MAX_IMPORT_COLUMNS, MAX_IMPORT_ROWS, MAX_IMPORT_VALUE_LENGTH } from "@/lib/services/import/validation";
import { deterministicImportTarget, suggestAssessmentComponent } from "@/lib/services/import/assessment-components-shared";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a data import assistant for a Nigerian secondary school platform.
Given CSV/Excel headers and sample rows, map each column to the correct field.

Available target fields:
- fullName: Combined full name (when first and last are in one column) — split on first space at import
- firstName: Student's first name only
- lastName: Student's last name / surname only
- regNumber: Registration / admission number
- gender: Male or Female
- dateOfBirth: Student's date of birth
- className: Class/arm name (e.g. SS2A) as a per-row column, distinct from the
  overall class already selected for the import
- parentName: Parent or guardian name
- parentPhone: Parent or guardian phone number
- position: Position / rank in class for this subject
- subject: Subject name (e.g. Mathematics)
- ca1: Continuous Assessment 1 score
- ca2: Continuous Assessment 2 score
- exam: Exam score
- total: Total score
- grade: Letter grade (A, B, C, D, E, F)
- remark: Teacher remark / comment
- assessmentComponent: A school-specific score component such as CA1, classwork, assignment, notes, project, or practical. Include componentName, normalizedName, and suggested maxScore when known.
- ignore: Column should be skipped

Also detect if possible:
- class name (e.g. SS2A, JSS1B)
- subject (e.g. Mathematics, English)
- term (First, Second, Third)
- session (e.g. 2025/2026)

Nigerian school conventions:
- "S/N" or "No" or "Portal ID" or "ID" = serial/portal number → ignore
- "Surname" or "Last Name" = lastName
- "Other Names" or "First Name" or "Given Name" = firstName
- "Name" or "Student Name" or "Full Name" (single name column) = fullName
- "Reg No" or "Adm No" or "Admission Number" or "Reg / Admission No" = regNumber
- "1st Test", "First Test", "CA1", "CA2", classwork, assignments, projects and practicals = assessmentComponent
- "Exam" or "Examination" or any column containing "exam" (case-insensitive) = exam
- "Total" or "Aggregate" or "Overall" = total
- "Position" or "Rank" or "Pos" = ignore
- "Average" or "Avg" = ignore
- "CL. WK" or "Class Work" or "Classwork" = assessmentComponent
- "Notes" in a result sheet = assessmentComponent; narrative "Comment" = remark
- "MidTerm" or "Mid Term" or "Mid-Term" = ignore

IMPORTANT — Suffix patterns: Many Nigerian school spreadsheets use hyphenated column names like "CA1-test4", "Exam-exam", "-midTerm", "CL. WK.-test5". Strip the hyphen-suffix and match the prefix:
- If prefix contains "CA1" or "CA2" → assessmentComponent
- If prefix contains "exam" (case-insensitive) → exam
- If prefix contains "CL. WK" or "Class Work" → assessmentComponent
- If prefix contains "Notes" → assessmentComponent
- If prefix is "-midTerm" or starts with "-" → ignore

Return ONLY valid JSON matching this structure:
{
  "mappings": [{"source": "original_header", "target": "field_name", "confidence": 0.0-1.0}],
  "detectedClass": "SS2A" | null,
  "detectedSubject": "Mathematics" | null,
  "detectedTerm": "FIRST" | null,
  "detectedSession": "2025/2026" | null
}`;

const requestSchema = z.object({
  headers: z.array(z.string().trim().min(1).max(120)).min(1).max(MAX_IMPORT_COLUMNS),
  sampleRows: z.array(z.record(z.string().max(120), z.string().max(MAX_IMPORT_VALUE_LENGTH))).max(3),
  fileName: z.string().trim().min(1).max(200),
  totalRows: z.number().int().min(1).max(MAX_IMPORT_ROWS),
}).strict();
const targetSchema = z.enum(["fullName", "firstName", "lastName", "regNumber", "gender", "subject", "dateOfBirth", "className", "parentName", "parentPhone", "position", "ca1", "ca2", "assessmentComponent", "exam", "total", "grade", "remark", "ignore"]);
const outputSchema = z.object({
  mappings: z.array(z.object({
    source: z.string().max(120),
    target: targetSchema,
    confidence: z.number().finite(),
    componentName: z.string().trim().min(1).max(120).optional(),
    normalizedName: z.string().trim().min(1).max(120).optional(),
    maxScore: z.number().finite().positive().max(1000).optional(),
  })).max(MAX_IMPORT_COLUMNS).optional(),
  detectedClass: z.string().max(100).nullable().optional(),
  detectedSubject: z.string().max(120).nullable().optional(),
  detectedTerm: z.enum(["FIRST", "SECOND", "THIRD"]).nullable().optional(),
  detectedSession: z.string().regex(/^\d{4}\/\d{4}$/).nullable().optional(),
});

function redactSamples(headers: string[], rows: Record<string, string>[]) {
  return rows.map((row) => Object.fromEntries(headers.map((header) => {
    const sensitive = /name|reg|admission|phone|email|parent/i.test(header);
    const value = row[header] ?? "";
    return [header, sensitive ? "[redacted]" : value.slice(0, 100)];
  })));
}

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`import-analyze:${auth.userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: z.infer<typeof requestSchema>;
  try { body = requestSchema.parse(await request.json()); }
  catch { return Response.json({ error: "Invalid import analysis request" }, { status: 400 }); }
  const { headers, sampleRows, fileName, totalRows } = body;

  const userPrompt = `File: "${fileName}"

Headers: ${JSON.stringify(headers)}

Sample data (first ${sampleRows.length} rows; direct identifiers redacted):
${JSON.stringify(redactSamples(headers, sampleRows), null, 2)}

Map each header to the correct target field. Return JSON only.`;

  try {
    const { completion } = await openRouterCompletion(
      DOCUMENT_MODELS,
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, max_tokens: 2000, json: true }
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = outputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return Response.json({ error: "AI analysis returned an invalid mapping" }, { status: 502 });

    const validTargets = new Set([
      ...targetSchema.options,
    ]);

    const mappings = (parsed.data.mappings ?? [])
      .filter((m) => headers.includes(m.source) && validTargets.has(m.target))
      .map((m) => {
        const deterministicTarget = deterministicImportTarget(m.source);
        const componentSuggestion = suggestAssessmentComponent(m.source);
        const target = deterministicTarget ?? m.target;
        return {
        source: m.source,
        target,
        confidence: Math.min(1, Math.max(0, m.confidence ?? 0.5)),
        ...(target === "assessmentComponent" ? {
          componentName: m.componentName ?? componentSuggestion?.componentName ?? m.source,
          normalizedName: m.normalizedName ?? componentSuggestion?.normalizedName ?? m.source.trim().toLowerCase(),
          maxScore: m.maxScore ?? componentSuggestion?.maxScore,
        } : {}),
      };});

    const mappedSources = new Set(mappings.map((m) => m.source));
    for (const h of headers) {
      if (!mappedSources.has(h)) {
        const target = deterministicImportTarget(h) ?? "ignore";
        const component = suggestAssessmentComponent(h);
        mappings.push({
          source: h,
          target,
          confidence: target === "ignore" ? 0 : 0.9,
          ...(component ?? {}),
        });
      }
    }

    return Response.json({
      headers,
      sampleRows,
      mappings,
      detectedClass: parsed.data.detectedClass ?? null,
      detectedSubject: parsed.data.detectedSubject ?? null,
      detectedTerm: parsed.data.detectedTerm ?? null,
      detectedSession: parsed.data.detectedSession ?? null,
      totalRows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI analysis failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
