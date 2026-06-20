import { getExamForTaking } from "@/app/actions/exam-v2";
import { redirect } from "next/navigation";
import { ExamTaker } from "./ExamTaker";

export default async function TakeExamV2Page(props: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await props.params;
  const exam = await getExamForTaking(attemptId);

  if (!exam) redirect("/exams");
  if (exam.status === "SUBMITTED" || exam.status === "GRADED") {
    redirect(`/exams/v2/${attemptId}/results`);
  }

  return <ExamTaker exam={exam} />;
}
