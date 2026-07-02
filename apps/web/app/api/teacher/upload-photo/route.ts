import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`photo-upload:${userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Only JPEG, PNG, or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" || file.type === "image/jpg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const fileName = `${teacher.id}.${ext}`;

  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch (e) {
    return Response.json({ error: "Storage not configured" }, { status: 503 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
  // Append cache-bust so the browser reloads after re-upload
  const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await db.teacher.update({
    where: { id: teacher.id },
    data: { photoUrl: urlData.publicUrl },
  });

  return Response.json({ photoUrl });
}
