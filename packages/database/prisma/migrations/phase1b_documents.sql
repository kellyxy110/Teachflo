-- Phase 1B: Document table for PDF ingestion → RAG pipeline
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Document status enum
DO $$ BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL REFERENCES schools(id),
  "teacherId" TEXT NOT NULL,

  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  "classLevel" "ClassLevel",
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "pageCount" INTEGER,

  status "DocumentStatus" NOT NULL DEFAULT 'PENDING',
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  error TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS documents_school_idx ON documents ("schoolId");
