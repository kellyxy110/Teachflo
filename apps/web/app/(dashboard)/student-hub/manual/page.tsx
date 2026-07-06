import { ArrowLeft, PenLine } from "lucide-react";
import Link from "next/link";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";
import { ManualEntryClient } from "./ManualEntryClient";
import { createClass } from "@/app/actions/classes";
import { addStudent } from "@/app/actions/students";

export const metadata = { title: "Manual Entry — Student Data Hub" };

export default async function ManualEntryPage() {
  const { teacher, schoolId } = await requireSchool();

  const classes = await db.class.findMany({
    where: { schoolId },
    orderBy: [{ level: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { students: true } },
    },
    select: {
      id: true,
      name: true,
      level: true,
      session: true,
      term: true,
      _count: true,
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/student-hub"
          className="p-1.5 rounded-lg hover:bg-surface text-text-2 hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <PenLine size={18} className="text-green-500" />
            <h1 className="text-xl font-bold text-text">Manual Entry</h1>
          </div>
          <p className="text-sm text-text-2">
            Create classes, add students, and enter scores by hand.
          </p>
        </div>
      </div>

      <ManualEntryClient
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          session: c.session,
          term: c.term,
          studentCount: c._count.students,
        }))}
        schoolId={teacher.schoolId}
        teacherId={teacher.id}
      />
    </div>
  );
}
