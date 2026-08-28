import { Upload } from "lucide-react";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImportHubClient } from "./ImportHubClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Status";

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
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><Upload size={20} className="text-primary" aria-hidden="true" />Excel / CSV Import</span>}
        description="Upload a spreadsheet, review suggested mappings, confirm exactly what will be stored, then commit."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Student Data Hub", href: "/student-hub" }, { label: "Import" }]}
        status={<StatusBadge tone="info">Teacher confirmation required</StatusBadge>}
      />

      <ImportHubClient
        classes={classes}
        schoolId={teacher.schoolId}
        teacherId={teacher.id}
      />
    </div>
  );
}
