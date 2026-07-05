import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { mediaGenerationService } from "@/lib/media/service";
import type { GenerateMediaInput } from "@/lib/media/types";

// Image generation can take up to 60 s on HF; Replicate polling adds more.
export const maxDuration = 120;

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`media-gen:${userId}`);
  if (!ok) {
    return Response.json(
      { error: "Too many requests. Please wait before generating another image." },
      { status: 429 }
    );
  }

  let body: GenerateMediaInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.task || !body.prompt?.trim()) {
    return Response.json({ error: "task and prompt are required" }, { status: 400 });
  }

  if (body.prompt.length > 1000) {
    return Response.json({ error: "Prompt too long (max 1000 characters)" }, { status: 400 });
  }

  try {
    const result = await mediaGenerationService.generate(body, request.signal);
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image generation failed";

    if (msg.includes("not approved") || msg.includes("BLOCKED") || msg.includes("not implemented")) {
      return Response.json({ error: msg }, { status: 403 });
    }

    console.error("[media/generate]", e);
    return Response.json({ error: msg }, { status: 502 });
  }
}
