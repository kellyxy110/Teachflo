"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function getStudioDocuments() {
  const { schoolId } = await requireSchool();

  return db.document.findMany({
    where: { schoolId, status: "READY" },
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
  const { schoolId } = await requireSchool();

  return db.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      chunkIndex: number;
      metadata: Record<string, unknown> | null;
    }>
  >(
    `SELECT id, content, "chunkIndex", metadata
     FROM document_chunks
     WHERE "documentId" = $1 AND "schoolId" = $2
     ORDER BY "chunkIndex" ASC`,
    documentId,
    schoolId
  );
}
