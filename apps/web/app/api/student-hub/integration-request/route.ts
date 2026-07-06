import { safeAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    schoolName?: string;
    portalUrl?: string;
    adminContact?: string;
    message?: string;
    connectorId?: string;
  };

  if (!body.schoolName || !body.portalUrl || !body.adminContact) {
    return Response.json({ error: "schoolName, portalUrl, and adminContact are required" }, { status: 400 });
  }

  // Log the request. Future: persist to DB or forward via email notification.
  console.log("[IntegrationRequest]", {
    userId: auth.userId,
    connectorId: body.connectorId ?? "unknown",
    schoolName: body.schoolName,
    portalUrl: body.portalUrl,
    adminContact: body.adminContact,
    message: body.message ?? "",
    submittedAt: new Date().toISOString(),
  });

  return Response.json({
    success: true,
    message: "Your integration request has been received. We will reach out within 5 business days.",
  });
}
