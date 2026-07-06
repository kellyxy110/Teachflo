import {
  BasePortalConnector,
  type ConnectorMeta,
  type SchoolInfo,
  type AcademicSession,
  type TermInfo,
  type ClassInfo,
  type TeacherInfo,
  type StudentInfo,
  type SubjectInfo,
  type AssessmentStructure,
  type ResultRecord,
  type RemarkRecord,
} from "./base";

// SchoolCube connector — scrapes SchoolCube portal using session-based auth.
// SchoolCube does not publish a public API; this connector uses their web interface.
// Requires: portalUrl (school-specific subdomain), username, password.
export class SchoolCubeConnector extends BasePortalConnector {
  readonly meta: ConnectorMeta = {
    id: "schoolcube",
    name: "SchoolCube",
    description: "Connect to SchoolCube school management portal",
    isAvailable: false,
    requiresCredentials: true,
    supportedFeatures: ["students", "results", "attendance", "remarks", "subjects", "classes"],
    setupInstructions:
      "SchoolCube's API is behind Cloudflare Bot Protection which blocks all server-to-server requests from cloud providers. Direct integration is not possible at this time. Use the Excel/CSV import instead: export your result sheet from SchoolCube and upload it via the Import tab.",
  };

  private get baseUrl(): string {
    return (this.config.portalUrl ?? "").replace(/\/$/, "");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.sessionToken ? { Authorization: `Bearer ${this.sessionToken}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`SchoolCube API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async login(username: string, password: string) {
    const data = await this.request<{ token: string; expires_at: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    this.sessionToken = data.token;
    return { token: data.token, expiry: new Date(data.expires_at) };
  }

  async logout() {
    await this.request("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    this.sessionToken = undefined;
  }

  async refreshSession() {
    const data = await this.request<{ token: string; expires_at: string }>("/api/v1/auth/refresh", {
      method: "POST",
    });
    this.sessionToken = data.token;
    return { token: data.token, expiry: new Date(data.expires_at) };
  }

  async fetchSchool(): Promise<SchoolInfo> {
    const data = await this.request<{ name: string; code: string; address: string; state: string }>(
      "/api/v1/school"
    );
    return { name: data.name, code: data.code, address: data.address, state: data.state };
  }

  async fetchAcademicSessions(): Promise<AcademicSession[]> {
    const data = await this.request<Array<{ id: string; name: string; is_current: boolean }>>(
      "/api/v1/sessions"
    );
    return data.map((s) => ({ id: s.id, name: s.name, isCurrent: s.is_current }));
  }

  async fetchTerms(sessionId: string): Promise<TermInfo[]> {
    const data = await this.request<
      Array<{ id: string; name: string; term: number; is_current: boolean }>
    >(`/api/v1/sessions/${sessionId}/terms`);
    const termMap: Record<number, "FIRST" | "SECOND" | "THIRD"> = { 1: "FIRST", 2: "SECOND", 3: "THIRD" };
    return data.map((t) => ({
      id: t.id,
      sessionId,
      name: t.name,
      term: termMap[t.term] ?? "FIRST",
      isCurrent: t.is_current,
    }));
  }

  async fetchClasses(): Promise<ClassInfo[]> {
    const data = await this.request<
      Array<{ id: string; name: string; level: string; arm: string }>
    >("/api/v1/classes");
    return data.map((c) => ({ id: c.id, name: c.name, level: c.level, arm: c.arm }));
  }

  async fetchTeachers(): Promise<TeacherInfo[]> {
    const data = await this.request<Array<{ id: string; name: string; email: string; phone: string }>>(
      "/api/v1/staff"
    );
    return data.map((t) => ({ id: t.id, name: t.name, email: t.email, phone: t.phone }));
  }

  async fetchStudents(classId?: string): Promise<StudentInfo[]> {
    const url = classId ? `/api/v1/students?class_id=${classId}` : "/api/v1/students";
    const data = await this.request<
      Array<{
        id: string;
        admission_number: string;
        first_name: string;
        last_name: string;
        gender: string;
        class_id: string;
        class_name: string;
      }>
    >(url);
    return data.map((s) => ({
      id: s.id,
      admissionNumber: s.admission_number,
      firstName: s.first_name,
      lastName: s.last_name,
      gender: s.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : "MALE",
      classId: s.class_id,
      className: s.class_name,
    }));
  }

  async fetchSubjects(classId?: string): Promise<SubjectInfo[]> {
    const url = classId ? `/api/v1/subjects?class_id=${classId}` : "/api/v1/subjects";
    const data = await this.request<Array<{ id: string; name: string; class_id: string }>>(url);
    return data.map((s) => ({ id: s.id, name: s.name, classId: s.class_id }));
  }

  async fetchAssessmentStructure(): Promise<AssessmentStructure> {
    const data = await this.request<{
      ca1: number;
      ca2: number;
      exam: number;
      total: number;
      pass_mark: number;
    }>("/api/v1/assessment-structure");
    return {
      ca1MaxScore: data.ca1,
      ca2MaxScore: data.ca2,
      examMaxScore: data.exam,
      totalMaxScore: data.total,
      passMark: data.pass_mark,
    };
  }

  async fetchResults(termId: string, classId?: string): Promise<ResultRecord[]> {
    const url = classId
      ? `/api/v1/results?term_id=${termId}&class_id=${classId}`
      : `/api/v1/results?term_id=${termId}`;
    const data = await this.request<
      Array<{
        student_id: string;
        subject_id: string;
        subject_name: string;
        ca1: number;
        ca2: number;
        exam: number;
        total: number;
        grade: string;
        position: number;
        remark: string;
        session_id: string;
      }>
    >(url);
    return data.map((r) => ({
      studentId: r.student_id,
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      ca1: r.ca1,
      ca2: r.ca2,
      exam: r.exam,
      total: r.total,
      grade: r.grade,
      position: r.position,
      remark: r.remark,
      termId,
      sessionId: r.session_id,
    }));
  }

  async fetchRemarks(termId: string): Promise<RemarkRecord[]> {
    const data = await this.request<
      Array<{
        student_id: string;
        teacher_remark: string;
        principal_remark: string;
        behaviour_remark: string;
        attendance: number;
      }>
    >(`/api/v1/remarks?term_id=${termId}`);
    return data.map((r) => ({
      studentId: r.student_id,
      teacherRemark: r.teacher_remark,
      principalRemark: r.principal_remark,
      behaviourRemark: r.behaviour_remark,
      attendance: r.attendance,
      termId,
    }));
  }
}
