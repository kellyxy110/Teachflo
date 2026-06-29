"use client";

import * as XLSX from "xlsx";

export function downloadExcel(data: Record<string, unknown>[], fileName: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportExamToExcel(
  exam: { title: string; subject: string; classLevel: string; examType: string },
  questions: {
    number: number;
    section: string;
    type: string;
    stem: string;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
    optionE?: string | null;
    correctOption?: string | null;
    solution: string;
    explanation: string;
    difficulty?: string | null;
  }[],
) {
  const rows = questions.map((q) => ({
    "#": q.number,
    Section: q.section,
    Type: q.type,
    Question: q.stem,
    "Option A": q.optionA ?? "",
    "Option B": q.optionB ?? "",
    "Option C": q.optionC ?? "",
    "Option D": q.optionD ?? "",
    "Option E": q.optionE ?? "",
    "Correct Answer": q.correctOption ?? "",
    Solution: q.solution,
    Explanation: q.explanation,
    Difficulty: q.difficulty ?? "",
  }));

  const slug = exam.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  downloadExcel(rows, `${slug}_questions`, exam.title);
}

export function exportScoresToExcel(
  className: string,
  subject: string,
  term: string,
  scores: {
    studentName: string;
    regNumber?: string | null;
    ca1?: number | null;
    ca2?: number | null;
    exam?: number | null;
    total?: number | null;
    grade?: string | null;
  }[],
) {
  const rows = scores.map((s, i) => ({
    "#": i + 1,
    "Student Name": s.studentName,
    "Reg Number": s.regNumber ?? "",
    "CA1 (20)": s.ca1 ?? "",
    "CA2 (20)": s.ca2 ?? "",
    "Exam (60)": s.exam ?? "",
    "Total (100)": s.total ?? "",
    Grade: s.grade ?? "",
  }));

  const slug = `${className}_${subject}_${term}`.replace(/[^a-zA-Z0-9]/g, "_");
  downloadExcel(rows, slug, `${className} - ${subject}`);
}

// ── CBT / Multi-format exports ────────────────────────────────────────────────

type ExportQuestion = {
  number?: number;
  section?: string;
  type?: string;
  stem: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  optionE?: string | null;
  correctOption?: string | null;
  solution?: string;
  explanation?: string;
  difficulty?: string | null;
  topic?: string | null;
  marks?: number | null;
};

function slugify(s: string) {
  return s.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** CBT format: columns A-G = Question, OptionA-E, CorrectAnswer */
export function exportCBTExcel(
  exam: { title: string; subject: string; classLevel: string },
  questions: ExportQuestion[],
) {
  const mcq = questions.filter((q) => !q.type || q.type === "MCQ" || q.section === "A");
  const rows = mcq.map((q, i) => ({
    "#": i + 1,
    Question: q.stem,
    "Option A": q.optionA ?? "",
    "Option B": q.optionB ?? "",
    "Option C": q.optionC ?? "",
    "Option D": q.optionD ?? "",
    "Option E": q.optionE ?? "",
    CorrectAnswer: q.correctOption ?? "",
  }));
  downloadExcel(rows, `${slugify(exam.title)}_CBT`, `${exam.subject} CBT`);
}

/** CSV export — all question data */
export function exportCSV(
  exam: { title: string; subject: string; classLevel: string },
  questions: ExportQuestion[],
) {
  const headers = [
    "#", "Question", "Type", "Option A", "Option B", "Option C",
    "Option D", "Option E", "Correct Answer", "Solution", "Explanation",
    "Difficulty", "Topic",
  ];
  const escape = (v: string | null | undefined) => {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return `"${s}"`;
  };
  const rows = questions.map((q, i) => [
    i + 1,
    escape(q.stem),
    escape(q.type ?? "MCQ"),
    escape(q.optionA),
    escape(q.optionB),
    escape(q.optionC),
    escape(q.optionD),
    escape(q.optionE),
    escape(q.correctOption),
    escape(q.solution),
    escape(q.explanation),
    escape(q.difficulty),
    escape(q.topic),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  downloadText(csv, `${slugify(exam.title)}_questions.csv`, "text/csv;charset=utf-8;");
}

/** JSON export — full question data */
export function exportJSON(
  exam: { title: string; subject: string; classLevel: string; examType?: string },
  questions: ExportQuestion[],
) {
  const payload = {
    exam: {
      title: exam.title,
      subject: exam.subject,
      classLevel: exam.classLevel,
      examType: exam.examType ?? "",
      questionCount: questions.length,
      exportedAt: new Date().toISOString(),
    },
    questions: questions.map((q, i) => ({
      number: i + 1,
      type: q.type ?? "MCQ",
      stem: q.stem,
      options: {
        A: q.optionA ?? null,
        B: q.optionB ?? null,
        C: q.optionC ?? null,
        D: q.optionD ?? null,
        E: q.optionE ?? null,
      },
      correctAnswer: q.correctOption ?? null,
      solution: q.solution ?? "",
      explanation: q.explanation ?? "",
      difficulty: q.difficulty ?? null,
      topic: q.topic ?? null,
    })),
  };
  downloadText(
    JSON.stringify(payload, null, 2),
    `${slugify(exam.title)}_questions.json`,
    "application/json",
  );
}

function xmlEscape(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Moodle XML export (GIFT-compatible multichoice) */
export function exportMoodleXML(
  exam: { title: string; subject: string },
  questions: ExportQuestion[],
) {
  const items = questions
    .filter((q) => (!q.type || q.type === "MCQ") && q.optionA)
    .map((q, i) => {
      const optKeys = ["A", "B", "C", "D", "E"] as const;
      const answers = optKeys
        .map((k) => {
          const val = q[`option${k}` as keyof ExportQuestion] as string | null;
          if (!val) return "";
          const isCorrect = q.correctOption === k;
          const fraction = isCorrect ? 100 : 0;
          return `    <answer fraction="${fraction}" format="html">
      <text><![CDATA[${val}]]></text>
      <feedback format="html"><text>${isCorrect ? "Correct." : ""}</text></feedback>
    </answer>`;
        })
        .filter(Boolean)
        .join("\n");

      return `  <question type="multichoice">
    <name><text>${xmlEscape(exam.subject)} Q${i + 1}</text></name>
    <questiontext format="html">
      <text><![CDATA[${q.stem}]]></text>
    </questiontext>
    <defaultgrade>1</defaultgrade>
    <shuffleanswers>1</shuffleanswers>
    <single>true</single>
${answers}
  </question>`;
    })
    .join("\n\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n\n${items}\n\n</quiz>`;
  downloadText(xml, `${slugify(exam.title)}_moodle.xml`, "application/xml");
}

/** IMS QTI 2.1 export */
export function exportQTI(
  exam: { title: string; subject: string },
  questions: ExportQuestion[],
) {
  const items = questions
    .filter((q) => (!q.type || q.type === "MCQ") && q.optionA)
    .map((q, i) => {
      const id = `Q${String(i + 1).padStart(3, "0")}`;
      const optKeys = ["A", "B", "C", "D", "E"] as const;
      const choices = optKeys
        .map((k) => {
          const val = q[`option${k}` as keyof ExportQuestion] as string | null;
          if (!val) return "";
          return `        <simpleChoice identifier="${k}"><![CDATA[${val}]]></simpleChoice>`;
        })
        .filter(Boolean)
        .join("\n");

      return `  <assessmentItem identifier="${id}" title="${xmlEscape(exam.subject)} Q${i + 1}" adaptive="false" timeDependent="false">
    <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
      <correctResponse><value>${q.correctOption ?? "A"}</value></correctResponse>
    </responseDeclaration>
    <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
      <defaultValue><value>0</value></defaultValue>
    </outcomeDeclaration>
    <itemBody>
      <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">
        <prompt><![CDATA[${q.stem}]]></prompt>
${choices}
      </choiceInteraction>
    </itemBody>
    <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
  </assessmentItem>`;
    })
    .join("\n\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<assessmentTest identifier="${slugify(exam.title)}" title="${xmlEscape(exam.title)}" xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">\n\n${items}\n\n</assessmentTest>`;
  downloadText(xml, `${slugify(exam.title)}_qti.xml`, "application/xml");
}

export function exportReportCard(
  student: { name: string; regNumber?: string | null; className: string },
  term: string,
  session: string,
  scores: {
    subject: string;
    ca1?: number | null;
    ca2?: number | null;
    exam?: number | null;
    total?: number | null;
    grade?: string | null;
    remark?: string | null;
  }[],
  summary: {
    totalScore: number;
    averageScore: number;
    subjectCount: number;
    position?: string;
  },
) {
  const header = [
    ["STUDENT REPORT CARD"],
    ["Name:", student.name, "", "Class:", student.className],
    ["Reg No:", student.regNumber ?? "N/A", "", "Term:", term],
    ["Session:", session],
    [],
    ["Subject", "CA1 (20)", "CA2 (20)", "Exam (60)", "Total (100)", "Grade", "Remark"],
  ];

  const rows = scores.map((s) => [
    s.subject,
    s.ca1 ?? "",
    s.ca2 ?? "",
    s.exam ?? "",
    s.total ?? "",
    s.grade ?? "",
    s.remark ?? "",
  ]);

  const footer = [
    [],
    ["", "", "", "Total Score:", summary.totalScore, "", ""],
    ["", "", "", "Average:", summary.averageScore.toFixed(1), "", ""],
    ["", "", "", "Subjects:", summary.subjectCount, "", ""],
    ...(summary.position ? [["", "", "", "Position:", summary.position, "", ""]] : []),
    [],
    ["Teacher's Signature: _______________", "", "", "Principal's Signature: _______________"],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);

  ws["!cols"] = [
    { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report Card");

  const slug = student.name.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `Report_Card_${slug}_${term}.xlsx`);
}
