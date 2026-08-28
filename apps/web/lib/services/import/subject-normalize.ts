// Subject canonicalization — prevents "Mathematics" / "Maths" / "Math" /
// "General Mathematics" from silently becoming unrelated academic histories.
//
// This produces a *suggestion* only. The teacher confirms or overrides it in
// the mapping UI before anything is written — never auto-merged silently.
// Once confirmed, the choice is learned per-school via SubjectAlias so the
// same raw value auto-suggests correctly on every future import.
//
// Score.subject (and the 9 other free-text subject columns elsewhere in the
// schema) are untouched by this — normalization produces a canonical string
// that gets written into the same column, so nothing else in the app needs
// to change to benefit from cleaner values going forward. Historical rows
// are not retroactively merged.

import { db } from "@/lib/db";
import { normalizeKey, type SubjectSuggestion } from "./subject-normalize-shared";

export { normalizeKey, type SubjectSuggestion };

// Platform-wide default synonyms. Deliberately small and Nigerian-curriculum-
// specific rather than a general NLP normalizer — a school can always override
// any of these via a confirmed SubjectAlias, since naming conventions genuinely
// vary (e.g. some schools track "General Mathematics" as WAEC's formal subject
// name distinct from "Further Mathematics", others just call it "Mathematics").
const BUILT_IN_SYNONYMS: Record<string, string> = {
  "maths": "Mathematics",
  "math": "Mathematics",
  "mathematics": "Mathematics",
  "general maths": "Mathematics",
  "general mathematics": "Mathematics",
  "further maths": "Further Mathematics",
  "further mathematics": "Further Mathematics",
  "eng": "English Language",
  "english": "English Language",
  "english lang": "English Language",
  "english language": "English Language",
  "bio": "Biology",
  "biology": "Biology",
  "chem": "Chemistry",
  "chemistry": "Chemistry",
  "phy": "Physics",
  "physics": "Physics",
  "govt": "Government",
  "government": "Government",
  "econs": "Economics",
  "economics": "Economics",
  "civic": "Civic Education",
  "civic ed": "Civic Education",
  "civic education": "Civic Education",
};

// Suggests a canonical subject name for each distinct raw value found in an
// import file. School-confirmed aliases take priority over built-in synonyms.
export async function suggestCanonicalSubjects(
  schoolId: string,
  rawValues: string[]
): Promise<SubjectSuggestion[]> {
  const distinctRaw = Array.from(new Set(rawValues.map((v) => v.trim()).filter(Boolean)));
  if (distinctRaw.length === 0) return [];

  const keys = distinctRaw.map(normalizeKey);
  const schoolAliases = await db.subjectAlias.findMany({
    where: { schoolId, rawValue: { in: keys } },
  });
  const aliasByKey = new Map(schoolAliases.map((a) => [a.rawValue, a.canonicalSubject]));

  return distinctRaw.map((raw) => {
    const key = normalizeKey(raw);
    const schoolMatch = aliasByKey.get(key);
    if (schoolMatch) return { raw, suggested: schoolMatch, source: "SCHOOL_ALIAS" as const };
    const builtIn = BUILT_IN_SYNONYMS[key];
    if (builtIn) return { raw, suggested: builtIn, source: "BUILT_IN" as const };
    return { raw, suggested: raw.trim(), source: "AS_ENTERED" as const };
  });
}

// Persists a teacher-confirmed raw → canonical mapping for this school so
// future imports suggest it automatically. Best-effort — never blocks import.
export async function learnSubjectAlias(
  schoolId: string,
  raw: string,
  canonicalSubject: string
): Promise<void> {
  const rawValue = normalizeKey(raw);
  if (!rawValue || rawValue === normalizeKey(canonicalSubject)) return;
  await db.subjectAlias
    .upsert({
      where: { schoolId_rawValue: { schoolId, rawValue } },
      create: { schoolId, rawValue, canonicalSubject },
      update: { canonicalSubject },
    })
    .catch(() => {});
}
