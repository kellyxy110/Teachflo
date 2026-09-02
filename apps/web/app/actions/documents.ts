"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { canDeletePrivateTeacherSource, removePrivateSourceIfPresent } from "@/lib/documents/private-source";
import { documentAccessWhere, privateBookshelfWhere } from "@/lib/documents/access";
import { readerFormat, searchSourceChunks } from "@/lib/documents/source-reader";
import { reconstructLessonSourceReference } from "@/lib/documents/source-reference";

export async function getDocuments() {
  const { schoolId, teacher } = await requireSchool();

  return db.document.findMany({
    where: documentAccessWhere(schoolId, teacher.id),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      classLevel: true,
      fileName: true,
      fileSize: true,
      pageCount: true,
      status: true,
      chunkCount: true,
      error: true,
      createdAt: true,
    },
  });
}

/** Documents in the authenticated teacher's private Bookshelf only. */
export async function getPrivateBookshelfDocuments() {
  const { schoolId, teacher } = await requireSchool();
  return db.document.findMany({
    where: privateBookshelfWhere(schoolId, teacher.id),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      classLevel: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      pageCount: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });
}

export type BookshelfSourceChunk = {
  id: string;
  content: string;
  chunkIndex: number;
  metadata: unknown;
};

/** Detail read is private-Bookshelf-only; school documents are not exposed here. */
export async function getPrivateBookshelfDocument(documentId: string) {
  const { schoolId, teacher } = await requireSchool();
  const document = await db.document.findFirst({
    where: privateBookshelfWhere(schoolId, teacher.id),
    select: { id: true, title: true, subject: true, classLevel: true, fileName: true, mimeType: true, fileSize: true, pageCount: true, status: true, error: true, createdAt: true, visibility: true },
  });
  if (!document) return null;
  const chunks = document.status === "READY"
    ? await db.$queryRawUnsafe<BookshelfSourceChunk[]>(
      `SELECT dc.id, dc.content, dc."chunkIndex", dc.metadata
       FROM document_chunks dc
       JOIN documents d ON d.id = dc."documentId"
       WHERE dc."documentId" = $1 AND dc."schoolId" = $2
         AND d."visibility" = 'PRIVATE' AND d."teacherId" = $3
       ORDER BY dc."chunkIndex" ASC`, documentId, schoolId, teacher.id)
    : [];
  return { document, chunks };
}

export async function searchPrivateBookshelfDocument(documentId: string, query: string) {
  const { schoolId, teacher } = await requireSchool();
  const document = await db.document.findFirst({
    where: { ...privateBookshelfWhere(schoolId, teacher.id), id: documentId },
    select: { id: true, mimeType: true, fileName: true, status: true },
  });
  if (!document) return null;
  if (document.status !== "READY") return { unavailable: true as const, results: [] };
  const chunks = await db.$queryRawUnsafe<Array<{ id: string; content: string; chunkIndex: number; metadata: unknown }>>(
    `SELECT dc.id, dc.content, dc."chunkIndex", dc.metadata
     FROM document_chunks dc JOIN documents d ON d.id = dc."documentId"
     WHERE dc."documentId" = $1 AND dc."schoolId" = $2
       AND d."visibility" = 'PRIVATE' AND d."teacherId" = $3
     ORDER BY dc."chunkIndex" ASC`, documentId, schoolId, teacher.id,
  );
  const boundedQuery = typeof query === "string" ? query.slice(0, 200) : "";
  return { unavailable: false as const, results: searchSourceChunks(chunks, boundedQuery, readerFormat(document.mimeType, document.fileName)).map((result) => ({ id: result.id, chunkIndex: result.chunkIndex, content: result.content, excerpt: result.excerpt, locationLabel: result.locationLabel, metadata: result.metadata })) };
}

export async function getPrivateSourceSelection(documentId: string, chunkId: string) {
  const { schoolId, teacher } = await requireSchool();
  const document = await db.document.findFirst({ where: { ...privateBookshelfWhere(schoolId, teacher.id), id: documentId }, select: { id: true, title: true, subject: true, classLevel: true, status: true } });
  if (!document || document.status !== "READY") return null;
  const rows = await db.$queryRawUnsafe<Array<{ id: string; content: string; metadata: unknown }>>(
    `SELECT dc.id, dc.content, dc.metadata FROM document_chunks dc JOIN documents d ON d.id = dc."documentId"
     WHERE dc.id = $1 AND dc."documentId" = $2 AND dc."schoolId" = $3 AND d."visibility" = 'PRIVATE' AND d."teacherId" = $4`, chunkId, documentId, schoolId, teacher.id,
  );
  const chunk = rows[0];
  if (!chunk) return null;
  const sourceReference = reconstructLessonSourceReference({ documentId, exactExcerpt: chunk.content, metadata: chunk.metadata });
  return { document, chunk: { id: chunk.id, content: chunk.content }, sourceReference };
}

export async function deleteDocument(documentId: string) {
  const { schoolId, teacher } = await requireSchool();

  const doc = await db.document.findFirst({
    where: { id: documentId, schoolId, teacherId: teacher.id },
  });
  if (!doc) throw new Error("Document not found");
  if (!canDeletePrivateTeacherSource({ documentSchoolId: doc.schoolId, documentTeacherId: doc.teacherId, requesterSchoolId: schoolId, requesterTeacherId: teacher.id })) {
    throw new Error("You do not own this private source");
  }

  // A private source is deleted only by its owning teacher. Legacy documents
  // without a private sidecar remain database-compatible and simply skip this.
  await removePrivateSourceIfPresent({
    schoolId,
    teacherId: teacher.id,
    documentId: doc.id,
    fileName: doc.fileName,
  }).catch((error) => {
    throw new Error(error instanceof Error ? error.message : "Private source deletion failed");
  });

  await db.$executeRawUnsafe(
    `DELETE FROM document_chunks WHERE "documentId" = $1`,
    documentId
  );

  await db.document.delete({ where: { id: documentId } });

  revalidatePath("/library");
  return { success: true };
}
