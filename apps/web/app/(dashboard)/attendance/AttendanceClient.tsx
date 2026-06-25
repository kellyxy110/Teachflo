"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  getStudentsForClass,
  getAttendanceForDate,
  saveAttendance,
  getAttendanceStats,
} from "@/app/actions/attendance";
import type { AttendanceStatus } from "@prisma/client";
import {
  Check, X, Clock, ShieldCheck,
  Users, CalendarDays, ChevronLeft, ChevronRight,
  Save, Loader2, BarChart3, UserCheck, UserX,
} from "lucide-react";

type ClassInfo = { id: string; name: string; level: string; studentCount: number };
type StudentRow = { id: string; firstName: string; lastName: string; regNumber: string | null; gender: string | null };
type AttendanceMap = Record<string, { id: string; status: AttendanceStatus; note: string | null }>;
type Stats = Awaited<ReturnType<typeof getAttendanceStats>>;

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: typeof Check; color: string; bg: string; activeBg: string }> = {
  PRESENT:  { label: "Present",  icon: Check,       color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10",  activeBg: "bg-emerald-500 text-white" },
  ABSENT:   { label: "Absent",   icon: X,           color: "text-red-600",     bg: "bg-red-50 dark:bg-red-500/10",          activeBg: "bg-red-500 text-white" },
  LATE:     { label: "Late",     icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-500/10",      activeBg: "bg-amber-500 text-white" },
  EXCUSED:  { label: "Excused",  icon: ShieldCheck, color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-500/10",        activeBg: "bg-blue-500 text-white" },
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function displayDate(d: Date): string {
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function AttendanceClient({ classes }: { classes: ClassInfo[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useTransition();
  const [tab, setTab] = useState<"mark" | "stats">("mark");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const dateStr = formatDate(date);
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const loadStudentsAndAttendance = useCallback(async (classId: string, d: string) => {
    setLoading(true);
    setSaved(false);
    try {
      const [studentList, existing] = await Promise.all([
        getStudentsForClass(classId),
        getAttendanceForDate(classId, d),
      ]);
      setStudents(studentList);
      const initial: Record<string, AttendanceStatus> = {};
      for (const s of studentList) {
        initial[s.id] = existing[s.id]?.status ?? "PRESENT";
      }
      setMarks(initial);
      if (Object.keys(existing).length > 0) setSaved(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentsAndAttendance(selectedClassId, dateStr);
    }
  }, [selectedClassId, dateStr, loadStudentsAndAttendance]);

  const loadStats = useCallback(async (classId: string) => {
    setStatsLoading(true);
    try {
      const s = await getAttendanceStats(classId);
      setStats(s);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId && tab === "stats") {
      loadStats(selectedClassId);
    }
  }, [selectedClassId, tab, loadStats]);

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    if (d <= new Date()) setDate(d);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  }

  function markAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) next[s.id] = status;
    setMarks(next);
    setSaved(false);
  }

  function handleSave() {
    if (!selectedClassId) return;
    setSaving(async () => {
      const records = Object.entries(marks).map(([studentId, status]) => ({
        studentId,
        status,
      }));
      await saveAttendance(selectedClassId, dateStr, records);
      setSaved(true);
    });
  }

  const presentCount = Object.values(marks).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(marks).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(marks).filter((s) => s === "LATE").length;
  const excusedCount = Object.values(marks).filter((s) => s === "EXCUSED").length;
  const isToday = dateStr === formatDate(new Date());

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users size={48} className="text-border mb-4" />
        <h2 className="text-lg font-bold text-text mb-1">No Classes Yet</h2>
        <p className="text-sm text-muted max-w-xs">
          Create a class and add students before you can take attendance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Class selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select a class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level}) — {c.studentCount} students
            </option>
          ))}
        </select>

        {selectedClassId && (
          <div className="flex bg-surface border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setTab("mark")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === "mark" ? "bg-primary text-white" : "text-text-2 hover:bg-border/20"
              }`}
            >
              <CalendarDays size={15} />
              <span className="hidden sm:inline">Mark</span>
            </button>
            <button
              onClick={() => setTab("stats")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === "stats" ? "bg-primary text-white" : "text-text-2 hover:bg-border/20"
              }`}
            >
              <BarChart3 size={15} />
              <span className="hidden sm:inline">Stats</span>
            </button>
          </div>
        )}
      </div>

      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays size={40} className="text-border mb-3" />
          <p className="text-sm text-muted">Select a class to mark attendance</p>
        </div>
      )}

      {/* MARK TAB */}
      {selectedClassId && tab === "mark" && (
        <>
          {/* Date navigator */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
            <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-border/20 text-muted hover:text-text transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-text">{displayDate(date)}</p>
              {isToday && <span className="text-[10px] font-bold text-primary">Today</span>}
            </div>
            <button
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className="p-1.5 rounded-lg hover:bg-border/20 text-muted hover:text-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => markAll("PRESENT")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors active:scale-[0.97]">
              <UserCheck size={14} />All Present
            </button>
            <button onClick={() => markAll("ABSENT")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold shrink-0 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors active:scale-[0.97]">
              <UserX size={14} />All Absent
            </button>
          </div>

          {/* Summary bar */}
          {students.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{presentCount}</p>
                <p className="text-[10px] font-medium text-muted uppercase">Present</p>
              </div>
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{absentCount}</p>
                <p className="text-[10px] font-medium text-muted uppercase">Absent</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{lateCount}</p>
                <p className="text-[10px] font-medium text-muted uppercase">Late</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{excusedCount}</p>
                <p className="text-[10px] font-medium text-muted uppercase">Excused</p>
              </div>
            </div>
          )}

          {/* Student list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users size={32} className="text-border mb-2" />
              <p className="text-sm text-muted">No students in this class</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student, i) => {
                const currentStatus = marks[student.id] ?? "PRESENT";
                return (
                  <div key={student.id} className="bg-surface border border-border rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="w-6 h-6 rounded-full bg-border/30 flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text truncate">
                          {student.lastName} {student.firstName}
                        </p>
                        {student.regNumber && (
                          <p className="text-[11px] text-muted">{student.regNumber}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => {
                        const cfg = STATUS_CONFIG[status];
                        const Icon = cfg.icon;
                        const isActive = currentStatus === status;
                        return (
                          <button
                            key={status}
                            onClick={() => setStatus(student.id, status)}
                            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-bold transition-all active:scale-[0.95] ${
                              isActive ? cfg.activeBg : `${cfg.bg} ${cfg.color} hover:opacity-80`
                            }`}
                          >
                            <Icon size={16} />
                            <span className="hidden sm:inline">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save button — sticky bottom */}
          {students.length > 0 && (
            <div className="sticky bottom-16 md:bottom-0 z-10">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98] ${
                  saved
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-white hover:bg-primary-600"
                } disabled:opacity-70`}
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" />Saving...</>
                ) : saved ? (
                  <><Check size={16} />Saved — {displayDate(date)}</>
                ) : (
                  <><Save size={16} />Save Attendance ({students.length} students)</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* STATS TAB */}
      {selectedClassId && tab === "stats" && (
        <div className="space-y-4">
          {statsLoading || !stats ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : stats.daysRecorded === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 size={40} className="text-border mb-3" />
              <h3 className="text-sm font-bold text-text mb-1">No Attendance Data</h3>
              <p className="text-xs text-muted">Mark attendance first to see analytics</p>
            </div>
          ) : (
            <>
              {/* Overview cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-xs text-muted font-medium">Days Recorded</p>
                  <p className="text-2xl font-bold text-text mt-1">{stats.daysRecorded}</p>
                  <p className="text-[11px] text-muted">this month</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-xs text-muted font-medium">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {stats.totalRecords > 0
                      ? Math.round(((stats.totalPresent + stats.totalLate) / stats.totalRecords) * 100)
                      : 0}%
                  </p>
                  <p className="text-[11px] text-muted">present + late</p>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text mb-3">Monthly Breakdown</h3>
                <div className="space-y-2.5">
                  {([
                    { label: "Present", count: stats.totalPresent, color: "bg-emerald-500", total: stats.totalRecords },
                    { label: "Absent", count: stats.totalAbsent, color: "bg-red-500", total: stats.totalRecords },
                    { label: "Late", count: stats.totalLate, color: "bg-amber-500", total: stats.totalRecords },
                    { label: "Excused", count: stats.totalExcused, color: "bg-blue-500", total: stats.totalRecords },
                  ]).map(({ label, count, color, total }) => {
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-text-2">{label}</span>
                          <span className="text-xs font-bold text-text">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* At-risk students (absent > 20%) */}
              {(() => {
                const atRisk = Object.entries(stats.studentStats)
                  .filter(([, s]) => s.total > 0 && (s.absent / s.total) > 0.2)
                  .sort(([, a], [, b]) => (b.absent / b.total) - (a.absent / a.total));

                if (atRisk.length === 0) return null;

                return (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                      Chronic Absenteeism Alert ({atRisk.length})
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400/80 mb-3">
                      Students absent more than 20% of recorded days
                    </p>
                    <div className="space-y-1.5">
                      {atRisk.slice(0, 5).map(([studentId, s]) => (
                        <div key={studentId} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-text truncate">{s.name}</span>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {Math.round((s.absent / s.total) * 100)}% absent
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
