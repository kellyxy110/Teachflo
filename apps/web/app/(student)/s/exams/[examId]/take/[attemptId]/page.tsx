import { getPublishedAttempt } from "@/app/actions/student-assessments";
import { StudentAssessmentPlayer } from "./StudentAssessmentPlayer";

export default async function StudentAssessmentTakePage({ params }: { params: Promise<{ examId: string; attemptId: string }> }) {
  const { attemptId } = await params;
  const delivery = await getPublishedAttempt(attemptId);
  if (!delivery) return null;
  return <StudentAssessmentPlayer delivery={delivery} />;
}
