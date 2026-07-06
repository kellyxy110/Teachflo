import { Upload, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImportHubClient } from "./ImportHubClient";

export const metadata = { title: "Import Data — Student Data Hub" };

export default async function StudentHubImportPage() {
  const { teacher, schoolId } = await requireSchool();

  const classes = await db.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true, session: true, term: true },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/student-hub"
          className="p-1.5 rounded-lg hover:bg-surface text-text-2 hover:text-text transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Upload size={18} className="text-primary" />
            <h1 className="text-xl font-bold text-text">Excel / CSV Import</h1>
          </div>
          <p className="text-sm text-text-2">
            Upload a spreadsheet — AI maps columns, you preview, then confirm.
          </p>
        </div>
      </div>

      <ImportHubClient
        classes={classes}
        schoolId={teacher.schoolId}
        teacherId={teacher.id}
      />
    </div>
  );
}
