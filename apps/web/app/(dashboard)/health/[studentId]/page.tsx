import { redirect } from "next/navigation";
import { getHealthRecord } from "@/app/actions/health";
import { HealthDetailClient } from "./HealthDetailClient";

export default async function HealthDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  let data;
  try {
    data = await getHealthRecord(studentId);
  } catch {
    redirect("/health");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <HealthDetailClient
        student={data.student}
        record={data.record}
      />
    </div>
  );
}
