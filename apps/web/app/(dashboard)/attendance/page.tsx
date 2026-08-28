import { getClassesForAttendance } from "@/app/actions/attendance";
import { AttendanceClient } from "./AttendanceClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AttendancePage() {
  const classes = await getClassesForAttendance();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Attendance" breadcrumb={[{ label: "Today", href: "/dashboard" }, { label: "Attendance" }]} description="Mark and review attendance by class and date." />
      <AttendanceClient
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          studentCount: c._count.students,
        }))}
      />
    </div>
  );
}
