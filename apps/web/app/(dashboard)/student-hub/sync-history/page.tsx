import { History, ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Sync History — Student Data Hub" };

const statusIcon = {
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  PARTIAL: AlertCircle,
  RUNNING: Clock,
} as const;

const statusColor = {
  COMPLETED: "text-green-500 bg-green-500/10",
  FAILED: "text-red-500 bg-red-500/10",
  PARTIAL: "text-amber-500 bg-amber-500/10",
  RUNNING: "text-blue-500 bg-blue-500/10",
} as const;

const sourceLabel: Record<string, string> = {
  EXCEL: "Excel Upload",
  CSV: "CSV Upload",
  PORTAL: "Portal Sync",
  MANUAL: "Manual Entry",
  OCR: "Scan/OCR",
};

export default async function SyncHistoryPage() {
  const { schoolId } = await requireSchool();

  const [syncLogs, importJobs] = await Promise.all([
    db.syncLog.findMany({
      where: { schoolId },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    db.importJob.findMany({
      where: { schoolId, status: "COMMITTED" },
      orderBy: { committedAt: "desc" },
      take: 20,
      select: {
        id: true,
        source: true,
        fileName: true,
        totalRows: true,
        newStudents: true,
        updatedStudents: true,
        newScores: true,
        committedAt: true,
        errors: true,
      },
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/student-hub"
          className="p-1.5 rounded-lg hover:bg-surface text-text-2 hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <History size={18} className="text-primary" />
            <h1 className="text-xl font-bold text-text">Sync History</h1>
          </div>
          <p className="text-sm text-text-2">
            All import and sync operations for your school.
          </p>
        </div>
      </div>

      {/* Committed Imports */}
      {importJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">
            Committed Imports
          </h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {importJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 px-4 py-3">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {job.fileName ?? `${sourceLabel[job.source] ?? job.source} import`}
                    </p>
                    <p className="text-xs text-text-2">
                      {job.totalRows} rows · {job.newStudents} new students · {job.newScores} scores
                      {job.errors.length > 0 && ` · ${job.errors.length} errors`}
                    </p>
                  </div>
                  <p className="text-xs text-text-2 whitespace-nowrap">
                    {job.committedAt
                      ? new Date(job.committedAt).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">
            Operation Log
          </h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {syncLogs.map((log) => {
                const Icon = statusIcon[log.status] ?? Clock;
                const color = statusColor[log.status] ?? "text-text-2 bg-bg";
                const summary = log.summary as Record<string, unknown>;
                return (
                  <div key={log.id} className="flex items-center gap-4 px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${color.split(" ")[1]}`}>
                      <Icon size={14} className={color.split(" ")[0]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text">
                        {log.type} — {sourceLabel[log.source] ?? log.source}
                      </p>
                      <p className="text-xs text-text-2 truncate">
                        {summary.studentsCreated !== undefined && `${summary.studentsCreated} created`}
                        {summary.studentsUpdated !== undefined && ` · ${summary.studentsUpdated} updated`}
                        {summary.scoresUpserted !== undefined && ` · ${summary.scoresUpserted} scores`}
                        {summary.error != null && ` · Error: ${String(summary.error)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
                        {log.status}
                      </span>
                      <p className="text-xs text-text-2 mt-0.5">
                        {new Date(log.startedAt).toLocaleDateString("en-NG")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {syncLogs.length === 0 && importJobs.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <History size={36} className="text-text-2 mx-auto mb-3" />
          <p className="font-medium text-text">No sync history yet</p>
          <p className="text-sm text-text-2 mt-1">
            Import your first data to see activity here.
          </p>
          <Link href="/student-hub/import"
            className="inline-block mt-4 text-sm text-primary hover:underline">
            Start importing →
          </Link>
        </div>
      )}
    </div>
  );
}
