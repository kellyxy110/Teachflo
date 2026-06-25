import { getClassesForAttendance } from "@/app/actions/attendance";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage() {
  const classes = await getClassesForAttendance();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
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
