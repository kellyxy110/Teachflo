import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ArrowLeft, Plus, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { addStudent } from "@/app/actions/students";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { schoolId } = await requireSchool();

  const cls = await db.class.findFirst({
    where: { id: classId, schoolId },
    include: {
      students: {
        where: { isActive: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
  });

  if (!cls) notFound();

  const addStudentToClass = async (formData: FormData) => {
    "use server";
    formData.set("classId", classId);
    await addStudent(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/classes"
          className="p-1.5 rounded-lg hover:bg-surface text-text-2 hover:text-text transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text">{cls.name}</h1>
          <p className="text-text-2 text-sm">
            {cls.term.charAt(0) + cls.term.slice(1).toLowerCase()} Term ·{" "}
            {cls.session} · {cls.students.length} students
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Add student form */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="font-semibold text-text mb-4">Add Student</h3>
          <form action={addStudentToClass} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">
                  First Name
                </label>
                <input
                  name="firstName"
                  required
                  placeholder="Ada"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">
                  Last Name
                </label>
                <input
                  name="lastName"
                  required
                  placeholder="Okafor"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">
                Reg. Number{" "}
                <span className="text-muted">(optional)</span>
              </label>
              <input
                name="regNumber"
                placeholder="e.g. 2024/0045"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">
                Gender
              </label>
              <select
                name="gender"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              >
                <option value="">Not specified</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus size={15} />
              Add Student
            </button>
          </form>
        </div>

        {/* Students table */}
        <div className="lg:col-span-2">
          {cls.students.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-12 text-center">
              <Users size={36} className="text-muted mx-auto mb-3" />
              <p className="font-medium text-text">No students yet</p>
              <p className="text-sm text-text-2 mt-1">
                Add students using the form.
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-bg flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">
                  Students ({cls.students.length})
                </h3>
                <Link
                  href={`/scores?classId=${cls.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Enter Scores <ChevronRight size={12} />
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-xs font-semibold text-text-2 w-8">
                      #
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-text-2">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-text-2">
                      Reg. No.
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-text-2">
                      Gender
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cls.students.map((student, i) => (
                    <tr key={student.id} className="hover:bg-bg transition-colors">
                      <td className="px-4 py-2.5 text-text-2 text-xs">
                        {i + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-text">
                        {student.lastName}, {student.firstName}
                      </td>
                      <td className="px-4 py-2.5 text-text-2 text-xs">
                        {student.regNumber ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-text-2 text-xs capitalize">
                        {student.gender?.toLowerCase() ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
