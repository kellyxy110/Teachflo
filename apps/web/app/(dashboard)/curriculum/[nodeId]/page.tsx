import { notFound } from "next/navigation";
import { getCurriculumTopicContext } from "@/app/actions/curriculum";
import { TopicDetailClient } from "./TopicDetailClient";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: { nodeId: string };
}) {
  let context;
  try {
    context = await getCurriculumTopicContext(params.nodeId);
  } catch {
    context = null;
  }

  if (!context) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <TopicDetailClient context={context} />
    </div>
  );
}
