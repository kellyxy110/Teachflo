"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { documentAccessWhere } from "@/lib/documents/access";

export async function getStudioDocuments() {
  const { schoolId, teacher } = await requireSchool();

  return db.document.findMany({
    where: { ...documentAccessWhere(schoolId, teacher.id), status: "READY" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      classLevel: true,
      fileName: true,
      fileSize: true,
      pageCount: true,
      chunkCount: true,
      createdAt: true,
    },
  });
}

export async function getDocumentChunks(documentId: string) {
  const { schoolId, teacher } = await requireSchool();
  const accessible = await db.document.findFirst({
    where: { id: documentId, ...documentAccessWhere(schoolId, teacher.id) },
    select: { id: true },
  });
  if (!accessible) throw new Error("Document not found");

  return db.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      chunkIndex: number;
      metadata: Record<string, unknown> | null;
    }>
  >(
    `SELECT dc.id, dc.content, dc."chunkIndex", dc.metadata
     FROM document_chunks dc
     JOIN documents d ON d.id = dc."documentId"
     WHERE dc."documentId" = $1 AND dc."schoolId" = $2
       AND (d."visibility" = 'SCHOOL' OR (d."visibility" = 'PRIVATE' AND d."teacherId" = $3))
     ORDER BY "chunkIndex" ASC`,
    documentId,
    schoolId,
    teacher.id
  );
}
