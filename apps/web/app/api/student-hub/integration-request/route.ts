import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const integrationRequestSchema = z.object({
  schoolName: z.string().trim().min(2).max(160),
  portalUrl: z.string().trim().url().max(500),
  adminContact: z.string().trim().min(3).max(160),
  message: z.string().trim().max(1_000).optional(),
  connectorId: z.string().trim().min(1).max(80).optional(),
}).strict();

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const { ok } = await rateLimit(`integration-request:${teacher.id}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  let body: z.infer<typeof integrationRequestSchema>;
  try { body = integrationRequestSchema.parse(await request.json()); }
  catch { return Response.json({ error: "Invalid integration request" }, { status: 400 }); }

  // Persisted so the request is actually actionable — a console.log line in a
  // serverless function is not something anyone reliably follows up on.
  await db.integrationRequest.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      connectorId: body.connectorId ?? "unknown",
      schoolName: body.schoolName,
      portalUrl: body.portalUrl,
      adminContact: body.adminContact,
      message: body.message ?? null,
    },
  });

  return Response.json({
    success: true,
    message: "Your integration request has been received. We will reach out within 5 business days.",
  });
}
