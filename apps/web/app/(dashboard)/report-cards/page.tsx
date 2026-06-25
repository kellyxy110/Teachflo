import { getClassesForReports } from "@/app/actions/report-cards";
import { ReportCardsClient } from "./ReportCardsClient";

export default async function ReportCardsPage() {
  const classes = await getClassesForReports();

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <ReportCardsClient
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
