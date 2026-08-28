// Pure, client-safe pieces of subject normalization — no `db` import, so this
// can be imported from "use client" components without pulling the Prisma
// client into the browser bundle. Server-only logic (DB lookups, learning
// aliases) lives in subject-normalize.ts, which imports from here.

export function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface SubjectSuggestion {
  raw: string;
  suggested: string;
  source: "SCHOOL_ALIAS" | "BUILT_IN" | "AS_ENTERED";
}
