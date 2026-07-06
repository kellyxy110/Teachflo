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

// Edves connector — connects to Edves school management platform.
// Edves provides a REST API for partner integrations.
// Requires: schoolCode, username, password (obtained from school's Edves admin).
export class EdvesConnector extends BasePortalConnector {
  readonly meta: ConnectorMeta = {
    id: "edves",
    name: "Edves",
    description: "Connect to Edves school management platform",
    isAvailable: true,
    requiresCredentials: true,
    supportedFeatures: ["students", "results", "remarks", "subjects", "classes", "attendance"],
    setupInstructions:
      "Enter your school code (from Edves admin dashboard), your Edves username, and password. We connect securely and never store your password.",
  };

  private readonly apiBase = "https://api.edves.net/v2";

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-School-Code": this.config.schoolCode ?? "",
        ...(this.sessionToken ? { Authorization: `Bearer ${this.sessionToken}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Edves API ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  }

  async login(username: string, password: string) {
    const data = await this.request<{ access_token: string; expires_in: number }>(
      "/auth/token",
      {
        method: "POST",
        body: JSON.stringify({ username, password, school_code: this.config.schoolCode }),
      }
    );
    this.sessionToken = data.access_token;
    const expiry = new Date(Date.now() + data.expires_in * 1000);
    return { token: data.access_token, expiry };
  }

  async logout() {
    await this.request("/auth/revoke", { method: "POST" }).catch(() => {});
    this.sessionToken = undefined;
  }

  async refreshSession() {
    const data = await this.request<{ access_token: string; expires_in: number }>(
      "/auth/refresh",
      { method: "POST" }
    );
    this.sessionToken = data.access_token;
    return { token: data.access_token, expiry: new Date(Date.now() + data.expires_in * 1000) };
  }

  async fetchSchool(): Promise<SchoolInfo> {
    const d = await this.request<{ school_name: string; address: string; state: string }>(
      "/school/info"
    );
    return { name: d.school_name, code: this.config.schoolCode, address: d.address, state: d.state };
  }

  async fetchAcademicSessions(): Promise<AcademicSession[]> {
    const d = await this.request<Array<{ session_id: string; session: string; current: boolean }>>(
      "/academic/sessions"
    );
    return d.map((s) => ({ id: s.session_id, name: s.session, isCurrent: s.current }));
  }

  async fetchTerms(sessionId: string): Promise<TermInfo[]> {
    const d = await this.request<
      Array<{ term_id: string; term_name: string; term_number: number; is_current: boolean }>
    >(`/academic/sessions/${sessionId}/terms`);
    const map: Record<number, "FIRST" | "SECOND" | "THIRD"> = { 1: "FIRST", 2: "SECOND", 3: "THIRD" };
    return d.map((t) => ({
      id: t.term_id,
      sessionId,
      name: t.term_name,
      term: map[t.term_number] ?? "FIRST",
      isCurrent: t.is_current,
    }));
  }

  async fetchClasses(): Promise<ClassInfo[]> {
    const d = await this.request<
      Array<{ class_id: string; class_name: string; level: string; arm: string }>
    >("/academic/classes");
    return d.map((c) => ({ id: c.class_id, name: c.class_name, level: c.level, arm: c.arm }));
  }

  async fetchTeachers(): Promise<TeacherInfo[]> {
    const d = await this.request<
      Array<{ staff_id: string; full_name: string; email: string; phone: string }>
    >("/staff");
    return d.map((t) => ({ id: t.staff_id, name: t.full_name, email: t.email, phone: t.phone }));
  }

  async fetchStudents(classId?: string): Promise<StudentInfo[]> {
    const url = classId ? `/students?class_id=${classId}` : "/students";
    const d = await this.request<
      Array<{
        student_id: string;
        adm_no: string;
        surname: string;
        firstname: string;
        sex: string;
        class_id: string;
        class_name: string;
      }>
    >(url);
    return d.map((s) => ({
      id: s.student_id,
      admissionNumber: s.adm_no,
      firstName: s.firstname,
      lastName: s.surname,
      gender: s.sex?.toUpperCase() === "F" || s.sex?.toUpperCase() === "FEMALE" ? "FEMALE" : "MALE",
      classId: s.class_id,
      className: s.class_name,
    }));
  }

  async fetchSubjects(classId?: string): Promise<SubjectInfo[]> {
    const url = classId ? `/subjects?class_id=${classId}` : "/subjects";
    const d = await this.request<Array<{ subject_id: string; subject_name: string; class_id: string }>>(url);
    return d.map((s) => ({ id: s.subject_id, name: s.subject_name, classId: s.class_id }));
  }

  async fetchAssessmentStructure(): Promise<AssessmentStructure> {
    const d = await this.request<{ ca1: number; ca2: number; exam: number; pass_mark: number }>(
      "/assessment/structure"
    );
    return {
      ca1MaxScore: d.ca1,
      ca2MaxScore: d.ca2,
      examMaxScore: d.exam,
      totalMaxScore: d.ca1 + d.ca2 + d.exam,
      passMark: d.pass_mark,
    };
  }

  async fetchResults(termId: string, classId?: string): Promise<ResultRecord[]> {
    const url = classId
      ? `/results?term_id=${termId}&class_id=${classId}`
      : `/results?term_id=${termId}`;
    const d = await this.request<
      Array<{
        student_id: string;
        subject_id: string;
        subject: string;
        ca1: number;
        ca2: number;
        exam: number;
        total: number;
        grade: string;
        position: number;
        session_id: string;
      }>
    >(url);
    return d.map((r) => ({
      studentId: r.student_id,
      subjectId: r.subject_id,
      subjectName: r.subject,
      ca1: r.ca1,
      ca2: r.ca2,
      exam: r.exam,
      total: r.total,
      grade: r.grade,
      position: r.position,
      termId,
      sessionId: r.session_id,
    }));
  }

  async fetchRemarks(termId: string): Promise<RemarkRecord[]> {
    const d = await this.request<
      Array<{
        student_id: string;
        class_teacher_remark: string;
        principal_remark: string;
        conduct: string;
        days_present: number;
      }>
    >(`/remarks?term_id=${termId}`);
    return d.map((r) => ({
      studentId: r.student_id,
      teacherRemark: r.class_teacher_remark,
      principalRemark: r.principal_remark,
      behaviourRemark: r.conduct,
      attendance: r.days_present,
      termId,
    }));
  }
}
