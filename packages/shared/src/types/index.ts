export type { ClassLevel } from "../constants/curriculum";
export type { Grade } from "../constants/grading";

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ExamType =
  | "SCHOOL_TEST"
  | "SCHOOL_EXAM"
  | "WAEC_MOCK"
  | "JAMB_PREP"
  | "JUPEB_PREP";

export type Difficulty = "BASIC" | "APPLICATION" | "WAEC" | "JAMB" | "JUPEB";

export type LessonMode = "STANDARD" | "ELI12" | "WAEC" | "JAMB" | "JUPEB";

export type Term = "FIRST" | "SECOND" | "THIRD";

export type TeacherRole = "TEACHER" | "HOD" | "ADMIN" | "SUPER_ADMIN";

export type Plan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
