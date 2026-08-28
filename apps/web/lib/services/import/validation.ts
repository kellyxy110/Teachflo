import { z } from "zod";

export const MAX_IMPORT_ROWS = 200;
export const MAX_IMPORT_COLUMNS = 100;
export const MAX_IMPORT_VALUE_LENGTH = 500;
export const MAX_SUBJECT_LENGTH = 120;

export const termSchema = z.enum(["FIRST", "SECOND", "THIRD"]);
export const fullNameFormatSchema = z.enum(["SURNAME_FIRST", "SURNAME_LAST", "KEEP_WHOLE"]);

const cellSchema = z.string().max(MAX_IMPORT_VALUE_LENGTH);
export const importRowSchema = z.object({
  fullName: cellSchema.optional(),
  firstName: cellSchema.optional(),
  lastName: cellSchema.optional(),
  regNumber: cellSchema.optional(),
  gender: cellSchema.optional(),
  subject: cellSchema.optional(),
  ca1: cellSchema.optional(),
  ca2: cellSchema.optional(),
  exam: cellSchema.optional(),
  total: cellSchema.optional(),
  grade: cellSchema.optional(),
  remark: cellSchema.optional(),
});

export const subjectCanonicalMapSchema = z.record(
  z.string().min(1).max(MAX_SUBJECT_LENGTH),
  z.string().trim().min(1).max(MAX_SUBJECT_LENGTH)
);

export const assessmentComponentMappingSchema = z.object({
  sourceColumn: z.string().trim().min(1).max(MAX_IMPORT_VALUE_LENGTH),
  componentName: z.string().trim().min(1).max(MAX_SUBJECT_LENGTH),
  normalizedName: z.string().trim().min(1).max(MAX_SUBJECT_LENGTH),
  maxScore: z.number().finite().positive().max(1000).optional(),
  order: z.number().int().min(0).max(MAX_IMPORT_COLUMNS),
  // The route resolves ownership from its authenticated teacher's school.
  // An existing ID is only a reference; it is verified against that school.
  existingComponentId: z.string().cuid().optional(),
  createConfirmed: z.boolean(),
}).strict().superRefine((mapping, context) => {
  if (Boolean(mapping.existingComponentId) === mapping.createConfirmed) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose an existing component or explicitly confirm creation of a new one",
      path: ["existingComponentId"],
    });
  }
});

export type AssessmentComponentMapping = z.infer<typeof assessmentComponentMappingSchema>;

export const importExecuteRequestSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS),
  classId: z.string().min(1).max(100),
  subject: z.string().trim().min(1).max(MAX_SUBJECT_LENGTH),
  term: termSchema,
  session: z.string().trim().regex(/^\d{4}\/\d{4}$/).max(9),
  schoolId: z.string().min(1).max(100),
  fullNameFormat: fullNameFormatSchema.optional(),
  fullNameFormatConfirmed: z.boolean().optional(),
  subjectCanonicalMap: subjectCanonicalMapSchema.optional(),
  subjectMappingsConfirmed: z.boolean().optional(),
  assessmentComponentMappings: z.array(assessmentComponentMappingSchema).max(MAX_IMPORT_COLUMNS).optional(),
  assessmentComponentsConfirmed: z.boolean().optional(),
}).strict();

const rowRecordSchema = z.record(z.string().min(1).max(MAX_IMPORT_COLUMNS), cellSchema).refine(
  (record) => Object.keys(record).length <= MAX_IMPORT_COLUMNS,
  "Too many columns"
);

export const stageRequestSchema = z.object({
  rows: z.array(z.object({
    rowIndex: z.number().int().min(0).max(MAX_IMPORT_ROWS - 1),
    rawData: rowRecordSchema,
    parsedData: rowRecordSchema,
  })).min(1).max(MAX_IMPORT_ROWS),
  classId: z.string().min(1).max(100),
  term: termSchema,
  session: z.string().trim().regex(/^\d{4}\/\d{4}$/).max(9),
  fullNameFormat: fullNameFormatSchema.optional(),
  fullNameFormatConfirmed: z.boolean().optional(),
  subjectCanonicalMap: subjectCanonicalMapSchema.optional(),
  subjectMappingsConfirmed: z.boolean().optional(),
  assessmentComponentMappings: z.array(assessmentComponentMappingSchema).max(MAX_IMPORT_COLUMNS).optional(),
  assessmentComponentsConfirmed: z.boolean().optional(),
}).strict().superRefine((request, context) => {
  const sourceColumns = request.assessmentComponentMappings?.map((mapping) => mapping.sourceColumn) ?? [];
  if (new Set(sourceColumns).size !== sourceColumns.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each source column can map to only one assessment component",
      path: ["assessmentComponentMappings"],
    });
  }
  const normalizedNames = request.assessmentComponentMappings?.map((mapping) =>
    mapping.normalizedName.trim().toLowerCase().replace(/\s+/g, " ")
  ) ?? [];
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each assessment component can be mapped only once",
      path: ["assessmentComponentMappings"],
    });
  }
});

export function hasChangedSubjectMapping(map: Record<string, string> | undefined): boolean {
  return Object.entries(map ?? {}).some(([raw, canonical]) => raw.trim().toLowerCase() !== canonical.trim().toLowerCase());
}

export function validateScoreValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  const text = String(value).trim();
  if (!text || text === "-" || text.toUpperCase() === "N/A") return true;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}

export function validateComponentScoreValue(value: unknown, maxScore?: number): boolean {
  if (value === undefined || value === null || value === "") return true;
  const text = String(value).trim();
  if (!text || text === "-" || text.toUpperCase() === "N/A") return true;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 && (maxScore === undefined || parsed <= maxScore);
}
