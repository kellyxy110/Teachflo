"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getStudentsWithHealth } from "@/app/actions/health";
import {
  HeartPulse, Search, Users, Droplets, Dna,
  ChevronRight, Loader2, Shield,
} from "lucide-react";

type ClassInfo = { id: string; name: string; level: string; studentCount: number };

type StudentWithHealth = {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  gender: string | null;
  class: { name: string; level: string };
  healthRecord: { id: string; bloodGroup: string | null; genotype: string | null } | null;
};

export function HealthListClient({ classes }: { classes: ClassInfo[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<StudentWithHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadStudents = useCallback(async (classId: string) => {
    setLoading(true);
    try {
      const data = await getStudentsWithHealth(classId || undefined);
      setStudents(data as StudentWithHealth[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) loadStudents(selectedClassId);
  }, [selectedClassId, loadStudents]);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.regNumber?.toLowerCase().includes(q)
    );
  });

  const withRecord = students.filter((s) => s.healthRecord).length;
  const withoutRecord = students.length - withRecord;

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users size={48} className="text-border mb-4" />
        <h2 className="text-lg font-bold text-text mb-1">No Classes Yet</h2>
        <p className="text-sm text-muted max-w-xs">
          Create a class and add students before managing health records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl">
          <HeartPulse size={22} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text">Health Records</h1>
          <p className="text-xs text-muted">Student health information management</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3">
        <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Health records are confidential. Only authorized staff can view and edit this information.
          This is not a diagnostic system — it is for school health information management only.
        </p>
      </div>

      {/* Class selector + search */}
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

        {selectedClassId && students.length > 0 && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 bg-surface border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HeartPulse size={40} className="text-border mb-3" />
          <p className="text-sm text-muted">Select a class to manage student health records</p>
        </div>
      )}

      {selectedClassId && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {selectedClassId && !loading && students.length > 0 && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-muted font-medium">Records Complete</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{withRecord}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-muted font-medium">Missing Records</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{withoutRecord}</p>
            </div>
          </div>

          {/* Student list */}
          <div className="space-y-2">
            {filtered.map((student) => {
              const hasRecord = !!student.healthRecord;
              return (
                <Link
                  key={student.id}
                  href={`/health/${student.id}`}
                  className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 md:p-4 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] group"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    hasRecord
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>
                    {student.firstName[0]}{student.lastName[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {student.lastName} {student.firstName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {student.regNumber && (
                        <span className="text-[11px] text-muted">{student.regNumber}</span>
                      )}
                      {student.healthRecord?.bloodGroup && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
                          <Droplets size={10} />{student.healthRecord.bloodGroup}
                        </span>
                      )}
                      {student.healthRecord?.genotype && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-purple-500">
                          <Dna size={10} />{student.healthRecord.genotype}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasRecord
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {hasRecord ? "Complete" : "Missing"}
                    </span>
                    <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 && search && (
            <div className="text-center py-8 text-sm text-muted">
              No students match &quot;{search}&quot;
            </div>
          )}
        </>
      )}

      {selectedClassId && !loading && students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users size={32} className="text-border mb-2" />
          <p className="text-sm text-muted">No students in this class</p>
        </div>
      )}
    </div>
  );
}
