import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chunkText } from "@/lib/chunker";
import { storeDocumentChunks } from "@/lib/vector-search";
import { PDFParse } from "pdf-parse";
import { rateLimit } from "@/lib/rate-limit";

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
    return Response.json(
      { error: "title and subject are required" },
      { status: 400 }
    );

  if (file.type !== "application/pdf") {
    return Response.json(
      { error: "Only PDF files are supported" },
      { status: 400 }
    );
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46 && header[4] === 0x2D;
  if (!isPdf) {
    return Response.json({ error: "Invalid PDF file" }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: "File must be under 10MB" },
      { status: 400 }
    );
  }

  const doc = await db.document.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      title,
      subject,
      classLevel: (["JS1","JS2","JS3","SS1","SS2","SS3"].includes(classLevel ?? "") ? classLevel as "JS1"|"JS2"|"JS3"|"SS1"|"SS2"|"SS3" : null),
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      status: "PROCESSING",
    },
  });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const textResult = await parser.getText();
    await parser.destroy();

    const text = textResult.text.trim();
    if (!text) {
      await db.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          error: "No extractable text found in PDF",
        },
      });
      return Response.json(
        {
          error:
            "PDF contains no extractable text (might be scanned/image-based)",
        },
        { status: 422 }
      );
    }

    const chunks = chunkText(text, 500, 50);
    if (chunks.length === 0) {
      await db.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          error: "Text extraction produced no usable chunks",
        },
      });
      return Response.json({ error: "No usable content" }, { status: 422 });
    }

    await storeDocumentChunks(
      doc.id,
      teacher.schoolId,
      chunks.map((content, i) => ({
        content,
        metadata: {
          documentTitle: title,
          subject,
          classLevel,
          fileName: file.name,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      }))
    );

    await db.document.update({
      where: { id: doc.id },
      data: {
        status: "READY",
        pageCount: textResult.total,
        chunkCount: chunks.length,
      },
    });

    return Response.json({
      id: doc.id,
      status: "READY",
      pages: textResult.total,
      chunks: chunks.length,
      characters: text.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    await db.document.update({
      where: { id: doc.id },
      data: { status: "FAILED", error: msg },
    });
    return Response.json({ error: msg }, { status: 500 });
  }
}
