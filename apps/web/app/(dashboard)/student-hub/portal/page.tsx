import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";
import { listConnectors } from "@/lib/services/connectors/registry";
import { PortalHubClient } from "./PortalHubClient";

export const metadata = { title: "School Portal Connector — Student Data Hub" };

export default async function PortalPage() {
  const { teacher, schoolId } = await requireSchool();

  const connectors = listConnectors();

  const activeConnections = await db.portalConnection.findMany({
    where: { schoolId, isActive: true },
    select: {
      id: true,
      portalType: true,
      displayName: true,
      schoolName: true,
      tokenExpiry: true,
      lastSynced: true,
    },
  });

  const classes = await db.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/student-hub"
          className="p-1.5 rounded-lg hover:bg-surface text-text-2 hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text">School Portal Connector</h1>
          <p className="text-sm text-text-2">Connect your school management system to sync data automatically.</p>
        </div>
      </div>

      <PortalHubClient
        connectors={connectors}
        activeConnections={activeConnections}
        classes={classes}
      />
    </div>
  );
}
