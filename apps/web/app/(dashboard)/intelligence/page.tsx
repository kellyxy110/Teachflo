import { getStudentsForTeacher } from "@/app/actions/study-buddy";
import { getSchoolMistakeSummary } from "@/app/actions/mistake-intelligence";
import { getCurriculumPlans } from "@/app/actions/curriculum-generator";
import { IntelligenceDashboard } from "./IntelligenceDashboard";

export default async function IntelligencePage() {
  const [students, mistakeSummary, curriculumPlans] = await Promise.all([
    getStudentsForTeacher(),
    getSchoolMistakeSummary(),
    getCurriculumPlans(),
  ]);

  return (
    <IntelligenceDashboard
      students={students}
      mistakeSummary={mistakeSummary}
      curriculumPlans={curriculumPlans}
    />
  );
}
