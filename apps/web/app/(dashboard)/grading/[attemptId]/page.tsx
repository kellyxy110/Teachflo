import { notFound } from "next/navigation";
import { requireSchool } from "@/lib/auth";
import { getGradingAttempt } from "@/lib/services/assessments/grading";
import { TeacherGradingClient } from "./TeacherGradingClient";

export default async function GradingAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { teacher, schoolId } = await requireSchool();
  let data;
  try { data = await getGradingAttempt(attemptId, { id: teacher.id, schoolId }); } catch { notFound(); }
  return <TeacherGradingClient data={data} />;
}
