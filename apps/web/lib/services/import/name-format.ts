// Full-name splitting — explicit, teacher-confirmed, never a silent assumption.
//
// A single "Full Name" column is ambiguous: Nigerian school registers commonly
// list "Surname OtherNames" (surname first), but not universally. Whichever
// direction is wrong silently swaps every student's first/last name. This
// module makes the split direction an explicit choice surfaced in the UI
// instead of a hardcoded guess.

export type FullNameFormat = "SURNAME_FIRST" | "SURNAME_LAST" | "KEEP_WHOLE";

export const FULL_NAME_FORMAT_LABELS: Record<FullNameFormat, string> = {
  SURNAME_FIRST: "Surname first (e.g. \"Doe John\")",
  SURNAME_LAST: "Surname last (e.g. \"John Doe\")",
  KEEP_WHOLE: "Don't split — keep as one name",
};

// Recommended default: matches this app's existing "Surname" / "Other Names"
// convention and preserves prior behavior for anyone already relying on it.
// It is only ever a pre-selected suggestion — the teacher must confirm it via
// the mapping UI before it's used, per the "no AI-only identity" requirement.
export const DEFAULT_FULL_NAME_FORMAT: FullNameFormat = "SURNAME_FIRST";

export interface SplitNameResult {
  firstName: string;
  lastName: string;
  rawFullName: string;
}

export function splitFullName(raw: string, format: FullNameFormat): SplitNameResult {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "", rawFullName: trimmed };
  }
  if (parts.length === 1) {
    // A single token cannot identify both a first name and a surname. Leave the
    // required split fields empty so the staging/execute validation surfaces it
    // for teacher correction instead of manufacturing a duplicated identity.
    return { firstName: "", lastName: "", rawFullName: trimmed };
  }

  if (format === "SURNAME_LAST") {
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
      rawFullName: trimmed,
    };
  }

  // SURNAME_FIRST and KEEP_WHOLE (best-effort split — see module comment on
  // why KEEP_WHOLE still populates required fields).
  return {
    firstName: parts.slice(1).join(" "),
    lastName: parts[0],
    rawFullName: trimmed,
  };
}
