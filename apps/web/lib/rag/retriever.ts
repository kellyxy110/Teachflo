import { db } from "../db";

interface RAGChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, unknown> | null;
  chunkIndex: number;
  similarity: number;
}

export async function retrieveRAGContext(
  query: string,
  schoolId: string,
  topK = 5,
  teacherId?: string
): Promise<RAGChunk[]> {
  const { generateEmbedding } = await import("../embeddings");
  const embedding = await generateEmbedding(query);
  const vec = `[${embedding.join(",")}]`;

  return db.$queryRawUnsafe<RAGChunk[]>(
    `SELECT dc.id, dc."documentId", dc.content, dc.metadata, dc."chunkIndex",
            1 - (embedding <=> $1::vector) as similarity
     FROM document_chunks dc
     JOIN documents d ON d.id = dc."documentId"
     WHERE ${teacherId ? 'dc."schoolId" = $2 AND (d."visibility" = \'SCHOOL\' OR (d."visibility" = \'PRIVATE\' AND d."teacherId" = $3))' : 'dc."schoolId" = $2 AND d."visibility" = \'SCHOOL\''}
     ORDER BY embedding <=> $1::vector
     LIMIT ${teacherId ? "$4" : "$3"}`,
    vec,
    schoolId,
    ...(teacherId ? [teacherId, topK] : [topK])
  );
}
