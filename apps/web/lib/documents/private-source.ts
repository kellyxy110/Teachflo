import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase";

export const PRIVATE_TEACHER_SOURCE = "PRIVATE_TEACHER_SOURCE" as const;
export const PRIVATE_TEACHER_SOURCE_BUCKET =
  process.env.TEACHER_SOURCE_BUCKET ?? "teacher-sources";
export const PRIVATE_SOURCE_PROCESSING_VERSION = "l3a-pdf-v1";
export const MAX_PRIVATE_SOURCE_BYTES = 10 * 1024 * 1024;

export type PrivateSourceMetadata = {
  version: 1;
  visibility: typeof PRIVATE_TEACHER_SOURCE;
  originalFileName: string;
  mimeType: string;
  size: number;
  sha256: string;
  storageKey: string;
  uploadedAt: string;
  processingVersion: string;
  schoolId: string;
  teacherId: string;
};

export function validatePdfUpload(input: { mimeType: string; size: number; header: Uint8Array }): string | null {
  const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
  if (!allowed.includes(input.mimeType)) return "Only PDF, DOCX, and TXT files are supported";
  if (input.size > MAX_PRIVATE_SOURCE_BYTES) return "File must be under 10 MB";
  const isPdf = input.mimeType === "application/pdf" && input.header.length >= 5 && input.header[0] === 0x25 && input.header[1] === 0x50 && input.header[2] === 0x44 && input.header[3] === 0x46 && input.header[4] === 0x2d;
  const isZip = input.mimeType.endsWith("wordprocessingml.document") && input.header.length >= 2 && input.header[0] === 0x50 && input.header[1] === 0x4b;
  if ((input.mimeType === "application/pdf" && !isPdf) || (input.mimeType.endsWith("wordprocessingml.document") && !isZip)) return "Invalid document signature";
  return null;
}

export function safeSourceFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "source.pdf";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return safe || "source.pdf";
}

export function privateSourceKey(schoolId: string, teacherId: string, documentId: string, fileName: string): string {
  return `${schoolId}/${teacherId}/${documentId}/${safeSourceFileName(fileName)}`;
}

export function privateSourceMetadataKey(sourceKey: string): string {
  return `${sourceKey}.metadata.json`;
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function isSafePrivateSourceKey(key: string): boolean {
  return key.length > 0 && !key.startsWith("/") && !key.includes("..") && !key.includes("\\") && /^[a-zA-Z0-9._/-]+$/.test(key);
}

export function canDeletePrivateTeacherSource(input: {
  documentSchoolId: string;
  documentTeacherId: string;
  requesterSchoolId: string;
  requesterTeacherId: string;
}): boolean {
  return input.documentSchoolId === input.requesterSchoolId && input.documentTeacherId === input.requesterTeacherId;
}

export function buildPrivateSourceMetadata(input: {
  schoolId: string;
  teacherId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  uploadedAt?: Date;
}): PrivateSourceMetadata {
  const storageKey = privateSourceKey(input.schoolId, input.teacherId, input.documentId, input.fileName);
  if (!isSafePrivateSourceKey(storageKey)) throw new Error("Unsafe private source storage key");
  return {
    version: 1,
    visibility: PRIVATE_TEACHER_SOURCE,
    originalFileName: input.fileName,
    mimeType: input.mimeType,
    size: input.buffer.length,
    sha256: sha256Buffer(input.buffer),
    storageKey,
    uploadedAt: (input.uploadedAt ?? new Date()).toISOString(),
    processingVersion: PRIVATE_SOURCE_PROCESSING_VERSION,
    schoolId: input.schoolId,
    teacherId: input.teacherId,
  };
}

export async function storePrivateSource(input: Parameters<typeof buildPrivateSourceMetadata>[0]): Promise<PrivateSourceMetadata> {
  const metadata = buildPrivateSourceMetadata(input);
  const supabase = createServerSupabaseClient();
  const bucket = supabase.storage.from(PRIVATE_TEACHER_SOURCE_BUCKET);
  const { error: uploadError } = await bucket.upload(metadata.storageKey, input.buffer, {
    contentType: input.mimeType,
    upsert: false,
  });
  if (uploadError) throw new Error(`Private source storage failed: ${uploadError.message}`);
  const metadataBody = Buffer.from(JSON.stringify(metadata), "utf8");
  const { error: metadataError } = await bucket.upload(privateSourceMetadataKey(metadata.storageKey), metadataBody, {
    contentType: "application/json",
    upsert: true,
  });
  if (metadataError) throw new Error(`Private source metadata storage failed: ${metadataError.message}`);
  return metadata;
}

export async function removePrivateSourceIfPresent(input: {
  schoolId: string;
  teacherId: string;
  documentId: string;
  fileName: string;
}): Promise<boolean> {
  const key = privateSourceKey(input.schoolId, input.teacherId, input.documentId, input.fileName);
  if (!isSafePrivateSourceKey(key)) throw new Error("Unsafe private source storage key");
  // Missing storage configuration is treated as “no private sidecar found”.
  // This keeps legacy database-only Documents deletable while never exposing
  // or fabricating a public URL. A configured private source remains intact
  // if storage cleanup cannot be performed.
  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch {
    return false;
  }
  const bucket = supabase.storage.from(PRIVATE_TEACHER_SOURCE_BUCKET);
  const { data, error } = await bucket.download(privateSourceMetadataKey(key));
  if (error || !data) return false;
  const { error: removeError } = await bucket.remove([key, privateSourceMetadataKey(key)]);
  if (removeError) throw new Error(`Private source deletion failed: ${removeError.message}`);
  return true;
}
