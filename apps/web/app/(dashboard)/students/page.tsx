import { Users } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export default async function StudentsPage() {
  const { schoolId } = await requireSchool();

  const students = await db.student.findMany({
    where: { schoolId, isActive: true },
    include: { class: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Students</h1>
          <p className="text-text-2 text-sm mt-0.5">
            {students.length} student{students.length !== 1 ? "s" : ""} across all classes
          </p>
        </div>
        <Link
          href="/classes"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          Manage via Classes
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Users size={40} className="text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text">No students yet</h3>
          <p className="text-sm text-text-2 mt-1">
            Add students through a class.{" "}
            <Link href="/classes" className="text-primary hover:underline">
              Go to Classes →
            </Link>
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-bg">
                <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-8">#</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-text-2">Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-text-2">Class</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-text-2">Reg. No.</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-text-2">Gender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-bg transition-colors">
                  <td className="px-4 py-2.5 text-xs text-text-2">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-text">
                    {s.lastName}, {s.firstName}
                  </td>
                  <td className="px-4 py-2.5 text-text-2">
                    <Link
                      href={`/classes/${s.classId}`}
                      className="text-primary hover:underline text-xs"
                    >
                      {s.class.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-2">
                    {s.regNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-2 capitalize">
                    {s.gender?.toLowerCase() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
