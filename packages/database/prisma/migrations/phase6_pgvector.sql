-- Phase 6: Semantic Memory Layer — pgvector
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Lesson embeddings (semantic lesson similarity)
CREATE TABLE IF NOT EXISTS lesson_embeddings (
  id TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL UNIQUE,
  "schoolId" TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1024) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Question embeddings (duplicate detection)
CREATE TABLE IF NOT EXISTS question_embeddings (
  id TEXT PRIMARY KEY,
  "questionId" TEXT NOT NULL UNIQUE,
  "schoolId" TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1024) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Document chunks (RAG retrieval)
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1024) NOT NULL,
  "chunkIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. HNSW vector indexes (fast approximate nearest neighbour)
CREATE INDEX IF NOT EXISTS lesson_emb_vec_idx
  ON lesson_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS question_emb_vec_idx
  ON question_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS doc_chunk_vec_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 6. Standard lookup indexes
CREATE INDEX IF NOT EXISTS lesson_emb_school_idx
  ON lesson_embeddings ("schoolId");

CREATE INDEX IF NOT EXISTS question_emb_school_idx
  ON question_embeddings ("schoolId");

CREATE INDEX IF NOT EXISTS doc_chunk_school_idx
  ON document_chunks ("schoolId");

CREATE INDEX IF NOT EXISTS doc_chunk_doc_idx
  ON document_chunks ("documentId");
