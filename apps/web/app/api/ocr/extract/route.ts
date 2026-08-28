import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getOpenRouterClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { validateImageBytes } from "@/lib/services/import/image-validation";
import { z } from "zod";

// Vision models that support image input via OpenRouter
const VISION_MODELS = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ocrOutputSchema = z.object({
  headers: z.array(z.string().trim().min(1).max(120)).min(1).max(100),
  rows: z.array(z.record(z.string().max(120), z.string().max(500))).max(200),
  detectedSubject: z.string().max(120).nullable().optional(),
  detectedClass: z.string().max(100).nullable().optional(),
  detectedTerm: z.enum(["FIRST", "SECOND", "THIRD"]).nullable().optional(),
  detectedSession: z.string().regex(/^\d{4}\/\d{4}$/).nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // OCR sends student data to a paid/external provider. Only a teacher with a
  // school context may invoke it; an authenticated student session is not enough.
  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher account required" }, { status: 403 });

  // Scoped per-user — a shared "ocr:extract" key let one caller exhaust the
  // platform-wide budget for every school, and this endpoint had no auth check
  // at all before this fix, so it was reachable by anyone on the internet.
  const { ok } = await rateLimit(`ocr:extract:${teacher.id}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) return Response.json({ error: "No image provided" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Image too large. Maximum 5 MB." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const verified = validateImageBytes(new Uint8Array(bytes));
  if (!verified.ok) return Response.json({ error: verified.error }, { status: 400 });
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${verified.type};base64,${base64}`;

  const prompt = `You are an expert at reading Nigerian school mark sheets and result slips.

Extract ALL student records from this image into a structured table.

Return ONLY valid JSON in this exact shape — no explanation, no markdown fences:
{
  "headers": ["Surname", "First Name", "Reg No", "CA1", "CA2", "Exam", "Total", "Grade"],
  "rows": [
    { "Surname": "...", "First Name": "...", "Reg No": "...", "CA1": "...", "CA2": "...", "Exam": "...", "Total": "...", "Grade": "..." }
  ],
  "detectedSubject": "Mathematics",
  "detectedClass": "SS2A",
  "detectedTerm": "FIRST",
  "detectedSession": "2025/2026"
}

Rules:
- Include every row visible in the image.
- If a column is not present in the image, omit it from headers and rows.
- Use the actual column names from the image as headers (e.g. "1st C.A", "2nd C.A", "Exam Score").
- detectedSubject, detectedClass, detectedTerm, detectedSession: set to null if not visible.
- Numbers should be strings ("25", not 25).
- Do not fabricate data — only extract what is clearly visible.`;

  let lastError: Error | null = null;

  for (const model of VISION_MODELS) {
    try {
      const client = getOpenRouterClient(model);
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }, { signal: AbortSignal.timeout(20000) });

      const raw = completion.choices[0]?.message?.content ?? "";

      // Strip markdown fences if model wraps response
      const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

      let parsed: z.infer<typeof ocrOutputSchema>;
      try {
        parsed = ocrOutputSchema.parse(JSON.parse(cleaned));
      } catch {
        throw new Error(`Model returned invalid JSON: ${cleaned.slice(0, 200)}`);
      }

      return Response.json({
        headers: parsed.headers,
        rows: parsed.rows,
        totalRows: parsed.rows.length,
        detectedSubject: parsed.detectedSubject ?? null,
        detectedClass: parsed.detectedClass ?? null,
        detectedTerm: parsed.detectedTerm ?? null,
        detectedSession: parsed.detectedSession ?? null,
        modelUsed: model,
      });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  return Response.json(
    { error: `OCR failed: ${lastError?.message ?? "All vision models failed"}` },
    { status: 500 }
  );
}
