import { getStudioDocuments } from "@/app/actions/knowledge-studio";
import { KnowledgeStudioClient } from "@/components/knowledge-studio/KnowledgeStudioClient";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function KnowledgeStudioPage() {
  await requireSchool();
  const documents = await getStudioDocuments();

  const subjectRows = await db.document.findMany({
    where: { status: "READY" },
    select: { subject: true },
    distinct: ["subject"],
  });
  const subjects = subjectRows.map((r) => r.subject);

  return (
    <div className="-m-6 h-[calc(100vh-64px)]">
      <KnowledgeStudioClient
        documents={JSON.parse(JSON.stringify(documents))}
        subjects={subjects}
      />
    </div>
  );
}
