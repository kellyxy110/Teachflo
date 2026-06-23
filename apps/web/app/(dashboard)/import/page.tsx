import { Upload } from "lucide-react";
import { ImportClient } from "./ImportClient";
import { getCurrentTeacher } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function ImportPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/onboarding");

  const classes = await db.class.findMany({
    where: { schoolId: teacher.schoolId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true, session: true },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Smart Import</h1>
        </div>
        <p className="text-sm text-text-2">
          Upload CSV or Excel files — result sheets, broadsheets, student lists.
          TeachFlow maps columns automatically.
        </p>
      </div>
      <ImportClient
        classes={classes}
        schoolId={teacher.schoolId}
        teacherId={teacher.id}
      />
    </div>
  );
}
