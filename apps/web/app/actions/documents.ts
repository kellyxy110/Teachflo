"use server";

import { db } from "@/lib/db";
import { requireSchool, requireTeacher } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getDocuments() {
  const { schoolId } = await requireSchool();

  return db.document.findMany({
    where: { schoolId },
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

export async function deleteDocument(documentId: string) {
  const { schoolId } = await requireSchool();

  const doc = await db.document.findFirst({
    where: { id: documentId, schoolId },
  });
  if (!doc) throw new Error("Document not found");

  await db.$executeRawUnsafe(
    `DELETE FROM document_chunks WHERE "documentId" = $1`,
    documentId
  );

  await db.document.delete({ where: { id: documentId } });

  revalidatePath("/library");
  return { success: true };
}
