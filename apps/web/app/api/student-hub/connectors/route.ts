import { safeAuth } from "@/lib/auth";
import { listConnectors } from "@/lib/services/connectors/registry";

// GET /api/student-hub/connectors — list available portal connectors
export async function GET() {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const connectors = listConnectors();
  return Response.json({ connectors });
}
