import { rateLimit } from "@/lib/rate-limit";
import { getOpenRouterClient } from "@/lib/ai";

// Vision models that support image input via OpenRouter
const VISION_MODELS = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const { ok } = await rateLimit("ocr:extract");
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) return Response.json({ error: "No image provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Unsupported image type. Use JPG, PNG, or WebP." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Image too large. Maximum 5 MB." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

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

      let parsed: {
        headers: string[];
        rows: Record<string, string>[];
        detectedSubject?: string | null;
        detectedClass?: string | null;
        detectedTerm?: string | null;
        detectedSession?: string | null;
      };

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error(`Model returned invalid JSON: ${cleaned.slice(0, 200)}`);
      }

      if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) {
        throw new Error("Model response missing headers or rows");
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
