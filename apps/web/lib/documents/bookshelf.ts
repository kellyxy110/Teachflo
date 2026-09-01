export type BookshelfDocumentRecord = {
  id: string;
  title: string;
  subject: string;
  classLevel: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number | null;
  status: string;
  error: string | null;
  createdAt: Date | string;
};

export function bookshelfFileType(mimeType: string, fileName: string): "PDF" | "DOCX" | "TXT" {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("wordprocessingml") || fileName.toLowerCase().endsWith(".docx")) return "DOCX";
  return "TXT";
}
export function filterBookshelfDocuments(
  documents: BookshelfDocumentRecord[],
  filters: { query?: string; subject?: string; classLevel?: string; fileType?: string; status?: string },
) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return documents.filter((document) => {
    const textMatch = !query || [document.title, document.subject, document.fileName].some((value) => value.toLowerCase().includes(query));
    return textMatch && (!filters.subject || document.subject === filters.subject)
      && (!filters.classLevel || document.classLevel === filters.classLevel)
      && (!filters.fileType || bookshelfFileType(document.mimeType, document.fileName) === filters.fileType)
      && (!filters.status || document.status === filters.status);
  });
}
