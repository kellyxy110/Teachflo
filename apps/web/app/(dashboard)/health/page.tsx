import { getClassesForHealth } from "@/app/actions/health";
import { HealthListClient } from "./HealthListClient";

export default async function HealthPage() {
  const classes = await getClassesForHealth();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <HealthListClient
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
