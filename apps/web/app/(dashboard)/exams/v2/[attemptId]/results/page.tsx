import { getExamAnalyticsV2 } from "@/app/actions/exam-v2";
import { redirect } from "next/navigation";
import { ExamResults } from "./ExamResults";

export default async function ExamResultsPage(props: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await props.params;
  const data = await getExamAnalyticsV2(attemptId);

  if (!data) redirect("/exams");

  return <ExamResults data={data} />;
}
