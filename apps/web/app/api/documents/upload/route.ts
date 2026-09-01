import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeDocumentChunks } from "@/lib/vector-search";
import { rateLimit } from "@/lib/rate-limit";
import { storePrivateSource, validatePdfUpload } from "@/lib/documents/private-source";
import { extractDocument, chunkExtractedBlocks } from "@/lib/documents/extraction";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`doc-upload:${userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { id: true, schoolId: true },
  });
  if (!teacher)
    return Response.json({ error: "Teacher not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "";
  const subject = (formData.get("subject") as string) || "";
  const classLevel = (formData.get("classLevel") as string) || null;

  if (!file)
    return Response.json({ error: "No file provided" }, { status: 400 });
  if (!title || !subject)
    return Response.json({ error: "title and subject are required" }, { status: 400 });

  // Verify PDF magic bytes
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const pdfError = validatePdfUpload({ mimeType: file.type, size: file.size, header });
  if (pdfError) return Response.json({ error: pdfError }, { status: pdfError === "File must be under 10 MB" ? 413 : 400 });

  const validLevels = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
  const doc = await db.document.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      title,
      subject,
      classLevel: validLevels.includes(classLevel ?? "")
        ? (classLevel as "JS1" | "JS2" | "JS3" | "SS1" | "SS2" | "SS3")
        : null,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      status: "PROCESSING",
      visibility: "PRIVATE",
    },
  });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Preserve the authoritative original before any parsing, chunking or embedding.
    // The object is private and addressed only by a server-derived ownership key.
    const sourceMetadata = await storePrivateSource({
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      documentId: doc.id,
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });
    const extracted = await extractDocument(buffer, file.type);
    const text = extracted.text.trim();
    const chunks = chunkExtractedBlocks(extracted.blocks, 500, 50);
    if (chunks.length === 0) {
      await db.document.update({
        where: { id: doc.id },
        data: { status: "FAILED", error: "Text extraction produced no usable chunks" },
      });
      return Response.json({ error: "No usable content extracted" }, { status: 422 });
    }

    await storeDocumentChunks(
      doc.id,
      teacher.schoolId,
      chunks.map((chunk) => ({
        content: chunk.sourceText,
        metadata: {
          documentTitle: title,
          subject,
          classLevel,
          fileName: file.name,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunks.length,
          provenance: { origin: "EXTRACTED_FROM_SOURCE", sourceDocumentId: doc.id, sourceHash: sourceMetadata.sha256, exactExcerpt: chunk.sourceExcerpt, normalizedText: chunk.normalizedText, sourceLocation: chunk.location, extractionMethod: chunk.extractionMethod, extractionVersion: chunk.extractionVersion },
        },
      }))
    );

    await db.document.update({
      where: { id: doc.id },
      data: {
        status: "READY",
        pageCount: extracted.pageCount,
        chunkCount: chunks.length,
      },
    });

    return Response.json({
      id: doc.id,
      status: "READY",
      pages: extracted.pageCount,
      chunks: chunks.length,
      characters: text.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    // Derived chunks are disposable; the private original is intentionally not touched.
    await db.$executeRawUnsafe(
      `DELETE FROM document_chunks WHERE "documentId" = $1`,
      doc.id
    ).catch(() => undefined);
    await db.document.update({
      where: { id: doc.id },
      data: { status: "FAILED", error: msg },
    });
    return Response.json({ error: msg }, { status: 500 });
  }
}
