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
  topK = 5
): Promise<RAGChunk[]> {
  const { generateEmbedding } = await import("../embeddings");
  const embedding = await generateEmbedding(query);
  const vec = `[${embedding.join(",")}]`;

  return db.$queryRawUnsafe<RAGChunk[]>(
    `SELECT id, "documentId", content, metadata, "chunkIndex",
            1 - (embedding <=> $1::vector) as similarity
     FROM document_chunks
     WHERE "schoolId" = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vec,
    schoolId,
    topK
  );
}
