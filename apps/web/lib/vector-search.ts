import { db } from "./db";
import { generateEmbedding, generateEmbeddings } from "./embeddings";

function toSqlVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// ── Similar Lesson Search ──────────────────────────────────────────────────

interface SimilarLessonResult {
  id: string;
  lessonId: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export async function findSimilarLessons(
  query: string,
  schoolId: string,
  limit = 5
): Promise<SimilarLessonResult[]> {
  const embedding = await generateEmbedding(query);
  const vec = toSqlVector(embedding);

  return db.$queryRawUnsafe<SimilarLessonResult[]>(
    `SELECT id, "lessonId", content, metadata,
            1 - (embedding <=> $1::vector) as similarity
     FROM lesson_embeddings
     WHERE "schoolId" = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vec,
    schoolId,
    limit
  );
}

// ── RAG Context Retrieval ──────────────────────────────────────────────────

interface RAGChunkResult {
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
): Promise<RAGChunkResult[]> {
  const embedding = await generateEmbedding(query);
  const vec = toSqlVector(embedding);

  return db.$queryRawUnsafe<RAGChunkResult[]>(
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

// ── Question Deduplication ─────────────────────────────────────────────────

interface DuplicateMatch {
  id: string;
  questionId: string;
  content: string;
  similarity: number;
}

export async function checkDuplicateQuestion(
  questionText: string,
  schoolId: string,
  threshold = 0.85
): Promise<{ isDuplicate: boolean; matches: DuplicateMatch[] }> {
  const embedding = await generateEmbedding(questionText);
  const vec = toSqlVector(embedding);

  const matches = await db.$queryRawUnsafe<DuplicateMatch[]>(
    `SELECT id, "questionId", content,
            1 - (embedding <=> $1::vector) as similarity
     FROM question_embeddings
     WHERE "schoolId" = $2
       AND 1 - (embedding <=> $1::vector) >= $3
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    vec,
    schoolId,
    threshold
  );

  return { isDuplicate: matches.length > 0, matches };
}

// ── Storage ────────────────────────────────────────────────────────────────

export async function storeLessonEmbedding(
  lessonId: string,
  schoolId: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  const embedding = await generateEmbedding(content);
  const vec = toSqlVector(embedding);
  const id = crypto.randomUUID();
  const meta = metadata ? JSON.stringify(metadata) : null;

  await db.$executeRawUnsafe(
    `INSERT INTO lesson_embeddings (id, "lessonId", "schoolId", content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)
     ON CONFLICT ("lessonId") DO UPDATE SET
       content = EXCLUDED.content,
       metadata = EXCLUDED.metadata,
       embedding = EXCLUDED.embedding`,
    id,
    lessonId,
    schoolId,
    content,
    meta,
    vec
  );
}

export async function storeQuestionEmbedding(
  questionId: string,
  schoolId: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  const embedding = await generateEmbedding(content);
  const vec = toSqlVector(embedding);
  const id = crypto.randomUUID();
  const meta = metadata ? JSON.stringify(metadata) : null;

  await db.$executeRawUnsafe(
    `INSERT INTO question_embeddings (id, "questionId", "schoolId", content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)
     ON CONFLICT ("questionId") DO UPDATE SET
       content = EXCLUDED.content,
       metadata = EXCLUDED.metadata,
       embedding = EXCLUDED.embedding`,
    id,
    questionId,
    schoolId,
    content,
    meta,
    vec
  );
}

export async function storeDocumentChunks(
  documentId: string,
  schoolId: string,
  chunks: Array<{ content: string; metadata?: Record<string, unknown> }>
) {
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

  await db.$executeRawUnsafe(
    `DELETE FROM document_chunks WHERE "documentId" = $1`,
    documentId
  );

  for (let i = 0; i < chunks.length; i++) {
    const vec = toSqlVector(embeddings[i]);
    const id = crypto.randomUUID();
    const meta = chunks[i].metadata ? JSON.stringify(chunks[i].metadata) : null;

    await db.$executeRawUnsafe(
      `INSERT INTO document_chunks (id, "documentId", "schoolId", content, metadata, embedding, "chunkIndex")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector, $7)`,
      id,
      documentId,
      schoolId,
      chunks[i].content,
      meta,
      vec,
      i
    );
  }
}
