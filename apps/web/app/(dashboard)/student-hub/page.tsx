import Link from "next/link";
import {
  Upload, Globe, PenLine, BarChart2, FileText,
  History, Database, Users, ClipboardList, Zap,
} from "lucide-react";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Student Data Hub — TeachNexis" };

export default async function StudentHubPage() {
  const { teacher, schoolId } = await requireSchool();

  const [classCount, studentCount, importJobCount, syncLogCount] = await Promise.all([
    db.class.count({ where: { schoolId } }),
    db.student.count({ where: { schoolId, isActive: true } }),
    db.importJob.count({ where: { schoolId, status: "COMMITTED" } }),
    db.syncLog.count({ where: { schoolId } }),
  ]);

  const recentJobs = await db.importJob.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, source: true, status: true, totalRows: true, createdAt: true, fileName: true },
  });

  const methods = [
    {
      href: "/student-hub/portal",
      icon: Globe,
      title: "School Portal Connector",
      desc: "Connect SchoolCube, Edves, Fedena and sync automatically",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: "Auto-sync",
    },
    {
      href: "/student-hub/import",
      icon: Upload,
      title: "Excel / CSV Import",
      desc: "Upload spreadsheets — AI maps columns automatically",
      color: "text-primary",
      bg: "bg-primary/10",
      badge: null,
    },
    {
      href: "/student-hub/manual",
      icon: PenLine,
      title: "Manual Entry",
      desc: "Create classes, students, and results by hand",
      color: "text-green-500",
      bg: "bg-green-500/10",
      badge: null,
    },
  ];

  const tools = [
    { href: "/student-hub/analytics", icon: BarChart2, label: "Analytics", desc: "Class averages, positions, grade distribution" },
    { href: "/student-hub/reports", icon: FileText, label: "Reports", desc: "Broadsheet, merit list, student report cards" },
    { href: "/student-hub/sync-history", icon: History, label: "Sync History", desc: "All imports and sync operations" },
    { href: "/classes", icon: Database, label: "Classes", desc: "Manage and view all classes" },
    { href: "/students", icon: Users, label: "Students", desc: "All student records" },
    { href: "/scores", icon: ClipboardList, label: "Result Register", desc: "Enter and view scores" },
  ];

  const sourceLabel: Record<string, string> = {
    EXCEL: "Excel",
    CSV: "CSV",
    PORTAL: "Portal",
    MANUAL: "Manual",
    OCR: "Scan",
  };

  const statusColor: Record<string, string> = {
    COMMITTED: "text-green-500 bg-green-500/10",
    STAGED: "text-amber-500 bg-amber-500/10",
    FAILED: "text-red-500 bg-red-500/10",
    DISCARDED: "text-text-2 bg-bg",
    PENDING: "text-blue-500 bg-blue-500/10",
    ANALYZING: "text-blue-500 bg-blue-500/10",
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap size={16} className="text-primary" />
          </div>
          <h1 className="text-2xl font-black text-text">Student Data Hub</h1>
        </div>
        <p className="text-sm text-text-2 ml-[42px]">
          Import, sync, analyse and report — one place for all student data.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Classes", value: classCount, color: "text-primary" },
          { label: "Students", value: studentCount, color: "text-green-500" },
          { label: "Imports", value: importJobCount, color: "text-amber-500" },
          { label: "Sync Ops", value: syncLogCount, color: "text-blue-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-text-2 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Import methods */}
      <div>
        <h2 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">
          Import Methods
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {methods.map(({ href, icon: Icon, title, desc, color, bg, badge }) => (
            <Link
              key={href}
              href={href}
              className="group bg-surface border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={20} className={color} />
                </div>
                {badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                    {badge}
                  </span>
                )}
              </div>
              <p className="font-bold text-text text-sm mb-1 group-hover:text-primary transition-colors">
                {title}
              </p>
              <p className="text-xs text-text-2">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">
          Tools & Reports
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tools.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-bg transition-all"
            >
              <Icon size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text">{label}</p>
                <p className="text-xs text-text-2 line-clamp-1">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent imports */}
      {recentJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">
            Recent Imports
          </h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center shrink-0">
                    <Upload size={14} className="text-text-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {job.fileName ?? `${sourceLabel[job.source] ?? job.source} import`}
                    </p>
                    <p className="text-xs text-text-2">
                      {job.totalRows} rows · {new Date(job.createdAt).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      statusColor[job.status] ?? "text-text-2 bg-bg"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <Link
                href="/student-hub/sync-history"
                className="text-xs text-primary hover:underline"
              >
                View all import history →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
