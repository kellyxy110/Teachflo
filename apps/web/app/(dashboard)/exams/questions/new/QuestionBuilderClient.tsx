"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { KaTeXPreview, LaTeXToolbar } from "@/components/exam/KaTeXPreview";
import { saveManualQuestion } from "@/app/actions/questions";
import type { ManualQuestionInput } from "@/app/actions/questions";
import type { ClassLevel, ExamType, Difficulty, Section, QuestionType } from "@prisma/client";

const CLASS_LEVELS: ClassLevel[] = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
const SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry", "Biology",
  "Agricultural Science", "Economics", "Government", "Literature in English",
  "Geography", "History", "Civic Education", "Christian Religious Studies",
  "Islamic Studies", "Further Mathematics", "Technical Drawing",
  "Food and Nutrition", "Computer Studies", "French",
];
const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "SCHOOL_TEST", label: "School Test" },
  { value: "SCHOOL_EXAM", label: "School Exam" },
  { value: "WAEC_MOCK", label: "WAEC Mock" },
  { value: "JAMB_PREP", label: "JAMB Prep" },
  { value: "JUPEB_PREP", label: "JUPEB Prep" },
];
const QUESTION_TYPES: { value: QuestionType; label: string; desc: string }[] = [
  { value: "MCQ", label: "Multiple Choice", desc: "A–E options with one correct answer" },
  { value: "SHORT_ANSWER", label: "Short Answer", desc: "Brief written response" },
  { value: "ESSAY", label: "Essay", desc: "Extended written response" },
  { value: "STRUCTURED", label: "Structured", desc: "Multi-part with sub-questions" },
  { value: "CALCULATION", label: "Calculation", desc: "Numeric answer with working" },
];
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "BASIC", label: "Basic" },
  { value: "APPLICATION", label: "Application" },
  { value: "WAEC", label: "WAEC" },
  { value: "JAMB", label: "JAMB" },
  { value: "JUPEB", label: "JUPEB" },
];
const SECTIONS: { value: Section; label: string }[] = [
  { value: "A", label: "Section A (Objectives)" },
  { value: "B", label: "Section B (Theory)" },
  { value: "C", label: "Section C (Advanced)" },
];
const BLOOM_LEVELS = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];

type ExamOption = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  classLevel: string;
  _count: { questions: number };
};

const INITIAL_FORM = {
  examId: "",
  subject: "",
  classLevel: "" as ClassLevel | "",
  topic: "",
  examType: "SCHOOL_EXAM" as ExamType,
  difficulty: "WAEC" as Difficulty,
  questionType: "MCQ" as QuestionType,
  section: "A" as Section,
  stem: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  optionE: "",
  correctOption: "",
  questionText: "",
  markScheme: "",
  solution: "",
  explanation: "",
  commonMistakes: "",
  examTip: "",
  curriculumRef: "",
  bloomLevel: "UNDERSTAND",
  skillTag: "",
  topicTag: "",
  subTopicTag: "",
  estimatedTime: 90,
};

export function QuestionBuilderClient({ exams }: { exams: ExamOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saved, setSaved] = useState<{ questionId: string; examId: string } | null>(null);
  const [error, setError] = useState("");
  const [addAnother, setAddAnother] = useState(false);

  const isMCQ = form.questionType === "MCQ";
  const isValid = form.stem && form.solution && form.explanation
    && form.subject && form.classLevel && form.topic
    && (!isMCQ || (form.optionA && form.optionB && form.optionC && form.optionD && form.correctOption));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (!isValid || !form.classLevel) return;
    setError("");
    setSaved(null);

    startTransition(async () => {
      try {
        const result = await saveManualQuestion({
          ...form,
          classLevel: form.classLevel as ClassLevel,
          examId: form.examId || undefined,
          estimatedTime: form.estimatedTime || 90,
        } as ManualQuestionInput);
        setSaved(result);

        if (addAnother) {
          setForm((f) => ({
            ...INITIAL_FORM,
            examId: result.examId,
            subject: f.subject,
            classLevel: f.classLevel,
            topic: f.topic,
            examType: f.examType,
            difficulty: f.difficulty,
            questionType: f.questionType,
            section: f.section,
            bloomLevel: f.bloomLevel,
          }));
        }
      } catch {
        setError("Failed to save question. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Destination: existing exam or new */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-text text-sm">Add to Exam</h3>
        <div>
          <label htmlFor="qb-examId" className="sr-only">Add to Exam</label>
          <select
            id="qb-examId"
            value={form.examId}
            onChange={(e) => set("examId", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Create new exam (from question details below)</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex._count.questions} questions)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Question metadata */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-text text-sm">Question Details</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="qb-subject" className="block text-xs font-medium text-text-2 mb-1">Subject *</label>
            <select id="qb-subject" aria-required="true" value={form.subject} onChange={(e) => set("subject", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select...</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="qb-classLevel" className="block text-xs font-medium text-text-2 mb-1">Class *</label>
            <select id="qb-classLevel" aria-required="true" value={form.classLevel} onChange={(e) => set("classLevel", e.target.value as ClassLevel)} className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select...</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="qb-examType" className="block text-xs font-medium text-text-2 mb-1">Exam Type</label>
            <select id="qb-examType" value={form.examType} onChange={(e) => set("examType", e.target.value as ExamType)} className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="qb-section" className="block text-xs font-medium text-text-2 mb-1">Section</label>
            <select id="qb-section" value={form.section} onChange={(e) => set("section", e.target.value as Section)} className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
              {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="qb-topic" className="block text-xs font-medium text-text-2 mb-1">Topic *</label>
          <input
            id="qb-topic"
            aria-required="true"
            type="text"
            value={form.topic}
            onChange={(e) => set("topic", e.target.value)}
            placeholder="e.g. Quadratic Equations, Photosynthesis..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="qb-skillTag" className="block text-xs font-medium text-text-2 mb-1">Skill Tag</label>
            <input id="qb-skillTag" type="text" value={form.skillTag} onChange={(e) => set("skillTag", e.target.value)} placeholder="e.g. factoring-quadratics" className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label htmlFor="qb-subTopicTag" className="block text-xs font-medium text-text-2 mb-1">Sub-topic</label>
            <input id="qb-subTopicTag" type="text" value={form.subTopicTag} onChange={(e) => set("subTopicTag", e.target.value)} placeholder="e.g. completing-the-square" className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label htmlFor="qb-estimatedTime" className="block text-xs font-medium text-text-2 mb-1">Time (seconds)</label>
            <input id="qb-estimatedTime" type="number" value={form.estimatedTime} onChange={(e) => set("estimatedTime", parseInt(e.target.value) || 90)} min={10} max={600} className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-medium text-text-2 mb-2">Difficulty</label>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTIES.map(({ value, label }) => (
              <button key={value} onClick={() => set("difficulty", value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.difficulty === value ? "bg-primary text-white border-primary" : "bg-bg text-text-2 border-border hover:border-primary/40"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bloom's Level */}
        <div>
          <label className="block text-xs font-medium text-text-2 mb-2">Bloom&apos;s Level</label>
          <div className="flex gap-2 flex-wrap">
            {BLOOM_LEVELS.map((b) => (
              <button key={b} onClick={() => set("bloomLevel", b)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.bloomLevel === b ? "bg-purple-600 text-white border-purple-600" : "bg-bg text-text-2 border-border hover:border-purple-400/40"}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Question type selector + content */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
        <h3 className="font-semibold text-text text-sm">Question Content</h3>

        {/* Type pills */}
        <div className="flex gap-2 flex-wrap">
          {QUESTION_TYPES.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => set("questionType", value)}
              title={desc}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                form.questionType === value
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-bg text-text-2 border-border hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Question stem */}
        <div>
          <label htmlFor="qb-stem" className="block text-xs font-medium text-text-2 mb-1">Question Stem * <span className="text-muted font-normal">— use $...$ for math symbols</span></label>
          <textarea
            id="qb-stem"
            aria-required="true"
            value={form.stem}
            onChange={(e) => set("stem", e.target.value)}
            rows={3}
            placeholder="Enter the question text... Use $x^{2}$ for math symbols"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y font-mono"
          />
          <LaTeXToolbar onInsert={(latex) => set("stem", form.stem + " " + latex)} />
          <KaTeXPreview text={form.stem} />
        </div>

        {/* MCQ options */}
        {isMCQ && (
          <div className="space-y-3">
            <span className="block text-xs font-medium text-text-2" id="qb-options-label">Options *</span>
            {(["A", "B", "C", "D", "E"] as const).map((opt) => {
              const key = `option${opt}` as keyof typeof form;
              const isCorrect = form.correctOption === opt;
              return (
                <div key={opt}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => set("correctOption", opt)}
                      className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                        isCorrect
                          ? "bg-success text-white border-success"
                          : "bg-bg text-text-2 border-border hover:border-success/40"
                      }`}
                      title={isCorrect ? "Correct answer" : `Mark ${opt} as correct`}
                    >
                      {opt}
                    </button>
                    <label htmlFor={`qb-option${opt}`} className="sr-only">Option {opt}</label>
                    <input
                      id={`qb-option${opt}`}
                      type="text"
                      aria-required={opt !== "E" ? "true" : undefined}
                      value={form[key] as string}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={opt === "E" ? "Option E (optional)" : `Option ${opt} *`}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {isCorrect && <CheckCircle size={16} className="text-success shrink-0" />}
                  </div>
                  <KaTeXPreview text={form[key] as string} />
                </div>
              );
            })}
            <p className="text-xs text-text-2">Click a letter to mark it as the correct answer. Use $...$ for math symbols in options.</p>
          </div>
        )}

        {/* Theory/structured additional text */}
        {!isMCQ && (
          <div>
            <label htmlFor="qb-questionText" className="block text-xs font-medium text-text-2 mb-1">Extended Question Text</label>
            <textarea
              id="qb-questionText"
              value={form.questionText}
              onChange={(e) => set("questionText", e.target.value)}
              rows={3}
              placeholder="Additional context, data tables, or sub-questions..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>
        )}

        {/* Solution */}
        <div>
          <label htmlFor="qb-solution" className="block text-xs font-medium text-text-2 mb-1">Solution / Model Answer * <span className="text-muted font-normal">— $...$ for math</span></label>
          <textarea
            id="qb-solution"
            aria-required="true"
            value={form.solution}
            onChange={(e) => set("solution", e.target.value)}
            rows={3}
            placeholder="Full solution with working..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <KaTeXPreview text={form.solution} />
        </div>

        {/* Explanation */}
        <div>
          <label htmlFor="qb-explanation" className="block text-xs font-medium text-text-2 mb-1">Explanation *</label>
          <textarea
            id="qb-explanation"
            aria-required="true"
            value={form.explanation}
            onChange={(e) => set("explanation", e.target.value)}
            rows={2}
            placeholder="Why this answer is correct — helps students understand..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <KaTeXPreview text={form.explanation} />
        </div>

        {/* Mark scheme (for theory/structured) */}
        {!isMCQ && (
          <div>
            <label htmlFor="qb-markScheme" className="block text-xs font-medium text-text-2 mb-1">Mark Scheme</label>
            <textarea
              id="qb-markScheme"
              value={form.markScheme}
              onChange={(e) => set("markScheme", e.target.value)}
              rows={2}
              placeholder="How marks should be awarded..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>
        )}

        {/* Common mistakes + exam tip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qb-commonMistakes" className="block text-xs font-medium text-text-2 mb-1">Common Mistakes</label>
            <input id="qb-commonMistakes" type="text" value={form.commonMistakes} onChange={(e) => set("commonMistakes", e.target.value)} placeholder="e.g. Students forget to square root both sides" className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label htmlFor="qb-examTip" className="block text-xs font-medium text-text-2 mb-1">Exam Tip</label>
            <input id="qb-examTip" type="text" value={form.examTip} onChange={(e) => set("examTip", e.target.value)} placeholder="e.g. Always check units in WAEC Physics" className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <label htmlFor="qb-addAnother" className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
            <input
              id="qb-addAnother"
              type="checkbox"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
              className="rounded border-border"
            />
            Add another question after saving
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isPending}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Save size={15} className="animate-pulse" /> Saving...</>
            ) : (
              <><Save size={15} /> Save Question</>
            )}
          </button>

          {saved && !addAnother && (
            <button
              onClick={() => router.push(`/exams/${saved.examId}`)}
              className="flex items-center gap-2 bg-success/10 text-success px-5 py-2.5 rounded-lg text-sm font-semibold border border-success/30 hover:bg-success/20 transition-colors"
            >
              View Exam →
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle size={14} /> Question saved successfully!
            {addAnother && " Form reset — add another question."}
          </div>
        )}
      </div>
    </div>
  );
}
