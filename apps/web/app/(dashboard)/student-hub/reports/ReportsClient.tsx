"use client";

import { useState } from "react";
import {
  FileText, Download, Loader2, AlertTriangle, CheckCircle,
  ClipboardList, Trophy, Users,
} from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
  level: string;
  term: string;
  session: string;
  studentCount: number;
  scoreCount: number;
}

const REPORT_TYPES = [
  {
    id: "broadsheet",
    icon: ClipboardList,
    title: "Result Broadsheet",
    desc: "All students × all subjects in one Excel sheet. Includes grade distribution and subject stats.",
    format: "Excel (.xlsx)",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    id: "merit-list",
    icon: Trophy,
    title: "Merit / Position List",
    desc: "Students ranked by average score from first to last.",
    format: "Excel (.xlsx)",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: "class-summary",
    icon: Users,
    title: "Class Summary Report",
    desc: "Class average, pass rates, grade distribution, and subject performance overview.",
    format: "Excel (.xlsx)",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
] as const;

type ReportType = typeof REPORT_TYPES[number]["id"];

export function ReportsClient({ classes }: { classes: ClassOption[] }) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? "");
  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDownloaded, setLastDownloaded] = useState<ReportType | null>(null);

  const cls = classes.find((c) => c.id === selectedClass);

  const download = async (type: ReportType) => {
    if (!selectedClass) return;
    setDownloading(type);
    setError(null);
    try {
      // All report types use the broadsheet API (different sheets inside)
      const url = `/api/student-hub/reports/broadsheet?classId=${selectedClass}`;
      const res = await fetch(url);
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Failed" })) as { error: string };
        throw new Error(d.error);
      }
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `${cls?.name ?? "class"}_${type}_${cls?.session?.replace("/", "-") ?? ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      setLastDownloaded(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Class selector */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-bold text-text text-sm mb-3">Select Class</h3>
        {classes.length === 0 ? (
          <p className="text-sm text-text-2">
            No classes found.{" "}
            <a href="/student-hub/import" className="text-primary hover:underline">
              Import data first →
            </a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  selectedClass === c.id
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border bg-surface text-text hover:border-primary/30"
                }`}
              >
                {c.name}
                <span className="ml-1.5 text-text-2 text-xs font-normal">
                  {c.studentCount} students · {c.scoreCount} scores
                </span>
              </button>
            ))}
          </div>
        )}
        {cls && (
          <p className="text-xs text-text-2 mt-3">
            {cls.level} · {cls.term} Term · {cls.session}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Report types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(({ id, icon: Icon, title, desc, format, color, bg }) => {
          const isDownloading = downloading === id;
          const isDone = lastDownloaded === id;
          return (
            <div key={id} className="bg-surface border border-border rounded-xl p-5 flex flex-col">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon size={20} className={color} />
              </div>
              <h3 className="font-bold text-text text-sm mb-1">{title}</h3>
              <p className="text-xs text-text-2 flex-1 mb-4">{desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-2 bg-bg px-2 py-0.5 rounded border border-border">
                  {format}
                </span>
                <button
                  onClick={() => download(id)}
                  disabled={!selectedClass || isDownloading || (cls?.scoreCount === 0)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isDone
                      ? "bg-green-500/10 text-green-500"
                      : "bg-primary text-white hover:bg-primary/90"
                  } disabled:opacity-40`}
                >
                  {isDownloading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isDone ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Download size={12} />
                  )}
                  {isDownloading ? "Generating…" : isDone ? "Downloaded" : "Download"}
                </button>
              </div>
              {cls?.scoreCount === 0 && selectedClass === cls?.id && (
                <p className="text-[11px] text-amber-500 mt-2">No scores in this class yet</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-bg border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText size={15} className="text-text-2 mt-0.5 shrink-0" />
          <div className="text-xs text-text-2 space-y-1">
            <p>All reports are generated directly from your imported data — no AI, pure calculation.</p>
            <p>Open the downloaded file in Microsoft Excel or Google Sheets.</p>
            <p>Broadsheet includes: Summary, Broadsheet, Subject Stats, and Merit List sheets.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
