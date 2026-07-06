// Portal connector interface — every school portal connector must implement this.
// Add new connectors without modifying this file (Open/Closed principle).

export interface SchoolInfo {
  name: string;
  code?: string;
  address?: string;
  state?: string;
  logoUrl?: string;
}

export interface AcademicSession {
  id: string;
  name: string; // e.g. "2024/2025"
  isCurrent: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface TermInfo {
  id: string;
  sessionId: string;
  name: string; // e.g. "First Term"
  term: "FIRST" | "SECOND" | "THIRD";
  isCurrent: boolean;
}

export interface ClassInfo {
  id: string;
  name: string; // e.g. "SS2A"
  level: string; // e.g. "SS2"
  arm?: string;  // e.g. "A"
  formTeacher?: string;
}

export interface TeacherInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subjects?: string[];
}

export interface StudentInfo {
  id: string;
  admissionNumber?: string;
  firstName: string;
  lastName: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: Date;
  classId: string;
  className?: string;
  parentPhone?: string;
  parentName?: string;
  photoUrl?: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
  classId?: string;
  teacherId?: string;
}

export interface AssessmentStructure {
  ca1MaxScore: number;
  ca2MaxScore: number;
  examMaxScore: number;
  totalMaxScore: number;
  passMark: number;
}

export interface ResultRecord {
  studentId: string;
  subjectId: string;
  subjectName: string;
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
  grade?: string;
  position?: number;
  remark?: string;
  termId: string;
  sessionId: string;
}

export interface RemarkRecord {
  studentId: string;
  teacherRemark?: string;
  principalRemark?: string;
  behaviourRemark?: string;
  attendance?: number;
  termId: string;
}

export interface SyncPayload {
  school: SchoolInfo;
  session: AcademicSession;
  term: TermInfo;
  classes: ClassInfo[];
  teachers: TeacherInfo[];
  students: StudentInfo[];
  subjects: SubjectInfo[];
  assessmentStructure?: AssessmentStructure;
  results: ResultRecord[];
  remarks: RemarkRecord[];
  syncedAt: Date;
}

export interface ConnectorConfig {
  portalUrl?: string;
  schoolCode?: string;
  username?: string;
  [key: string]: string | undefined;
}

export interface ConnectorMeta {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  isAvailable: boolean;
  requiresCredentials: boolean;
  supportedFeatures: ConnectorFeature[];
  setupInstructions?: string;
}

export type ConnectorFeature =
  | "students"
  | "results"
  | "attendance"
  | "remarks"
  | "subjects"
  | "classes"
  | "realtime_sync";

export abstract class BasePortalConnector {
  abstract readonly meta: ConnectorMeta;

  protected config: ConnectorConfig = {};
  protected sessionToken?: string;

  configure(config: ConnectorConfig): void {
    this.config = config;
  }

  restoreSession(token: string): void {
    this.sessionToken = token;
  }

  abstract login(username: string, password: string): Promise<{ token: string; expiry: Date }>;
  abstract logout(): Promise<void>;
  abstract refreshSession(): Promise<{ token: string; expiry: Date }>;

  abstract fetchSchool(): Promise<SchoolInfo>;
  abstract fetchAcademicSessions(): Promise<AcademicSession[]>;
  abstract fetchTerms(sessionId: string): Promise<TermInfo[]>;
  abstract fetchClasses(sessionId?: string): Promise<ClassInfo[]>;
  abstract fetchTeachers(): Promise<TeacherInfo[]>;
  abstract fetchStudents(classId?: string): Promise<StudentInfo[]>;
  abstract fetchSubjects(classId?: string): Promise<SubjectInfo[]>;
  abstract fetchAssessmentStructure(): Promise<AssessmentStructure>;
  abstract fetchResults(termId: string, classId?: string): Promise<ResultRecord[]>;
  abstract fetchRemarks(termId: string): Promise<RemarkRecord[]>;

  async sync(options?: { termId?: string; classId?: string }): Promise<SyncPayload> {
    const school = await this.fetchSchool();
    const sessions = await this.fetchAcademicSessions();
    const currentSession = sessions.find((s) => s.isCurrent) ?? sessions[0];

    const terms = await this.fetchTerms(currentSession.id);
    const currentTerm = options?.termId
      ? terms.find((t) => t.id === options.termId) ?? terms.find((t) => t.isCurrent) ?? terms[0]
      : (terms.find((t) => t.isCurrent) ?? terms[0]);

    const classes = await this.fetchClasses(currentSession.id);
    const teachers = await this.fetchTeachers();
    const students = await this.fetchStudents(options?.classId);
    const subjects = await this.fetchSubjects(options?.classId);
    const results = await this.fetchResults(currentTerm.id, options?.classId);
    const remarks = await this.fetchRemarks(currentTerm.id);
    const assessmentStructure = await this.fetchAssessmentStructure();

    return {
      school,
      session: currentSession,
      term: currentTerm,
      classes,
      teachers,
      students,
      subjects,
      assessmentStructure,
      results,
      remarks,
      syncedAt: new Date(),
    };
  }
}
