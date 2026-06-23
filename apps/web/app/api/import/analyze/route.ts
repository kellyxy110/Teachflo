import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { openRouterCompletion, DOCUMENT_MODELS } from "@/lib/ai";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a data import assistant for a Nigerian secondary school platform.
Given CSV/Excel headers and sample rows, map each column to the correct field.

Available target fields:
- firstName: Student's first name
- lastName: Student's last name / surname
- regNumber: Registration / admission number
- gender: Male or Female
- subject: Subject name (e.g. Mathematics)
- ca1: Continuous Assessment 1 score
- ca2: Continuous Assessment 2 score
- exam: Exam score
- total: Total score
- grade: Letter grade (A, B, C, D, E, F)
- remark: Teacher remark / comment
- ignore: Column should be skipped

Also detect if possible:
- class name (e.g. SS2A, JSS1B)
- subject (e.g. Mathematics, English)
- term (First, Second, Third)
- session (e.g. 2025/2026)

Nigerian school conventions:
- "S/N" or "No" = serial number → ignore
- "Surname" or "Last Name" = lastName
- "Other Names" or "First Name" or "Given Name" = firstName
- "Reg No" or "Adm No" or "Admission Number" = regNumber
- "1st Test" or "First Test" or "CA 1" or "Test 1" = ca1
- "2nd Test" or "Second Test" or "CA 2" or "Test 2" = ca2
- "Exam" or "Examination" = exam
- "Total" or "Aggregate" or "Overall" = total
- "Position" or "Rank" = ignore
- "Average" = ignore

Return ONLY valid JSON matching this structure:
{
  "mappings": [{"source": "original_header", "target": "field_name", "confidence": 0.0-1.0}],
  "detectedClass": "SS2A" | null,
  "detectedSubject": "Mathematics" | null,
  "detectedTerm": "FIRST" | null,
  "detectedSession": "2025/2026" | null
}`;

interface RequestBody {
  headers: string[];
  sampleRows: Record<string, string>[];
  fileName: string;
  totalRows: number;
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

  const body: RequestBody = await request.json();
  const { headers, sampleRows, fileName, totalRows } = body;

  if (!headers?.length) {
    return Response.json({ error: "No headers provided" }, { status: 400 });
  }

  const userPrompt = `File: "${fileName}"

Headers: ${JSON.stringify(headers)}

Sample data (first ${sampleRows.length} rows):
${JSON.stringify(sampleRows, null, 2)}

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
    let parsed: {
      mappings?: { source: string; target: string; confidence: number }[];
      detectedClass?: string | null;
      detectedSubject?: string | null;
      detectedTerm?: string | null;
      detectedSession?: string | null;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { mappings: [] };
    }

    const validTargets = new Set([
      "firstName", "lastName", "regNumber", "gender", "subject",
      "ca1", "ca2", "exam", "total", "grade", "remark", "ignore",
    ]);

    const mappings = (parsed.mappings ?? [])
      .filter((m) => headers.includes(m.source) && validTargets.has(m.target))
      .map((m) => ({
        source: m.source,
        target: m.target,
        confidence: Math.min(1, Math.max(0, m.confidence ?? 0.5)),
      }));

    const mappedSources = new Set(mappings.map((m) => m.source));
    for (const h of headers) {
      if (!mappedSources.has(h)) {
        mappings.push({ source: h, target: "ignore", confidence: 0 });
      }
    }

    return Response.json({
      headers,
      sampleRows,
      mappings,
      detectedClass: parsed.detectedClass ?? null,
      detectedSubject: parsed.detectedSubject ?? null,
      detectedTerm: parsed.detectedTerm ?? null,
      detectedSession: parsed.detectedSession ?? null,
      totalRows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI analysis failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
