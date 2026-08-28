import { Users } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";

export default async function StudentsPage() {
  const { schoolId } = await requireSchool();

  const students = await db.student.findMany({
    where: { schoolId, isActive: true },
    include: { class: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length !== 1 ? "s" : ""} across all classes`}
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Students" }]}
        primaryAction={<ButtonLink href="/classes" className="w-full sm:w-auto">Manage via Classes</ButtonLink>}
      />

      {students.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No students yet"
          description="Create a class or import your student register to begin."
          action={<div className="flex flex-wrap justify-center gap-2"><ButtonLink href="/classes" variant="secondary">Create a class</ButtonLink><ButtonLink href="/student-hub/import">Import students</ButtonLink></div>}
        />
      ) : (
        <ResponsiveTable label="Students register">
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
        </ResponsiveTable>
      )}
    </div>
  );
}
