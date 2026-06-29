"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Sparkles, ChevronRight, ChevronLeft,
  CheckCircle, AlertCircle, Loader2, Plus, ArrowRight,
  Brain, FlaskConical,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  JS: ["Mathematics", "English Language", "Social Studies", "Agricultural Science", "Basic Science", "Business Studies", "Civic Education", "Home Economics"],
  SS: ["Mathematics", "English Language", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English"],
};

const CLASS_LEVELS = [
  { value: "JS1", label: "JSS1", group: "JS" },
  { value: "JS2", label: "JSS2", group: "JS" },
  { value: "JS3", label: "JSS3", group: "JS" },
  { value: "SS1", label: "SS1", group: "SS" },
  { value: "SS2", label: "SS2", group: "SS" },
  { value: "SS3", label: "SS3", group: "SS" },
];

const TERMS = [
  { value: "", label: "All Terms" },
  { value: "FIRST", label: "First Term" },
  { value: "SECOND", label: "Second Term" },
  { value: "THIRD", label: "Third Term" },
];

const DIFFICULTIES = [
  { value: "BASIC", label: "Basic", desc: "Recall-level, JSS-friendly" },
  { value: "APPLICATION", label: "Application", desc: "40% recall, 60% application" },
  { value: "WAEC", label: "WAEC", desc: "Authentic WAEC style" },
  { value: "JAMB", label: "JAMB", desc: "High difficulty, CBT speed" },
];

const COUNT_OPTIONS = [5, 10, 15, 20, 30, 40];

type Topic = {
  id: string;
  label: string;
  description: string | null;
  term: string | null;
  week: number | null;
  bloomLevels: string[];
  examStandards: string[];
  keywords: string[];
  misconceptions: string[];
  difficulty: string | null;
};

type GeneratedQuestion = {
  stem: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  solution: string;
  explanation: string;
  commonMistakes?: string;
  examTip?: string;
  bloomLevel?: string;
};

type ExamOption = { id: string; title: string; questionCount: number };

export function GenerateAIClient({ exams }: { exams: ExamOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [term, setTerm] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Step 2 state
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("WAEC");

  // Step 3 state
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [genError, setGenError] = useState("");
  const [saveMode, setSaveMode] = useState<"existing" | "new">("existing");
  const [targetExamId, setTargetExamId] = useState("");
  const [newExamTitle, setNewExamTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedExamId, setSavedExamId] = useState("");
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const classGroup = CLASS_LEVELS.find((c) => c.value === classLevel)?.group ?? "SS";
  const subjectList = SUBJECTS_BY_LEVEL[classGroup] ?? SUBJECTS_BY_LEVEL.SS;

  const fetchTopics = useCallback(async (subj: string, cl: string, tm: string) => {
    if (!subj || !cl) return;
    setLoadingTopics(true);
    setTopicsError("");
    setTopics([]);
    setSelectedTopic(null);
    try {
      const params = new URLSearchParams({ subject: subj, classLevel: cl, ...(tm ? { term: tm } : {}) });
      const res = await fetch(`/api/cig/topics?${params}`);
      if (!res.ok) throw new Error("Failed to load topics");
      const data: Topic[] = await res.json();
      setTopics(data);
      if (data.length === 0) setTopicsError("No topics found in the curriculum graph for this combination.");
    } catch {
      setTopicsError("Could not load topics. Try again.");
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  function handleSubjectChange(s: string) {
    setSubject(s);
    setSelectedTopic(null);
    setTopics([]);
    if (s && classLevel) fetchTopics(s, classLevel, term);
  }

  function handleClassLevelChange(cl: string) {
    setClassLevel(cl);
    setSubject("");
    setSelectedTopic(null);
    setTopics([]);
  }

  function handleTermChange(t: string) {
    setTerm(t);
    setSelectedTopic(null);
    if (subject && classLevel) fetchTopics(subject, classLevel, t);
  }

  async function handleGenerate() {
    if (!selectedTopic) return;
    setGenerating(true);
    setGenError("");
    setQuestions([]);
    setStep(3);
    try {
      const res = await fetch("/api/exams/generate-cig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: selectedTopic.id, difficulty, mcqCount: count }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      setQuestions(data.questions ?? []);
      if (exams.length > 0) setTargetExamId(exams[0].id);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!questions.length || !selectedTopic) return;
    if (saveMode === "existing" && !targetExamId) return;
    if (saveMode === "new" && !newExamTitle.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/exams/generate-cig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: selectedTopic.id,
          difficulty,
          mcqCount: count,
          saveToExam: true,
          examId: saveMode === "existing" ? targetExamId : undefined,
          newExamTitle: saveMode === "new" ? newExamTitle.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Save failed");
      setSavedExamId(data.examId);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to save questions.");
    } finally {
      setSaving(false);
    }
  }

  const step1Valid = !!selectedTopic;
  const step2Valid = !!selectedTopic;

  // Group topics by term
  const topicsByTerm: Record<string, Topic[]> = {};
  for (const t of topics) {
    const key = t.term ?? "Other";
    if (!topicsByTerm[key]) topicsByTerm[key] = [];
    topicsByTerm[key].push(t);
  }
  const termOrder = ["FIRST", "SECOND", "THIRD", "Other"];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step ? "bg-success text-white" :
              s === step ? "bg-primary text-white" :
              "bg-bg border-2 border-border text-muted"
            }`}>
              {s < step ? <CheckCircle size={14} /> : s}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${s === step ? "text-text" : "text-muted"}`}>
              {s === 1 ? "Select Topic" : s === 2 ? "Configure" : "Preview & Save"}
            </span>
            {s < 3 && <ChevronRight size={14} className="text-border" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: SELECT TOPIC ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-text">Select a Curriculum Topic</h2>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Class Level *</label>
                <select
                  value={classLevel}
                  onChange={(e) => handleClassLevelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select...</option>
                  {CLASS_LEVELS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Subject *</label>
                <select
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  disabled={!classLevel}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">Select...</option>
                  {subjectList.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Term</label>
                <select
                  value={term}
                  onChange={(e) => handleTermChange(e.target.value)}
                  disabled={!subject}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Topics */}
            {loadingTopics && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted">
                <Loader2 size={15} className="animate-spin" /> Loading topics from curriculum graph...
              </div>
            )}

            {topicsError && (
              <div className="flex items-center gap-2 text-sm text-warning py-2">
                <AlertCircle size={14} /> {topicsError}
              </div>
            )}

            {!loadingTopics && topics.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {termOrder.filter((t) => topicsByTerm[t]).map((termKey) => (
                  <div key={termKey}>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
                      {termKey === "Other" ? "Other" : `${termKey.charAt(0) + termKey.slice(1).toLowerCase()} Term`}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {topicsByTerm[termKey].map((t) => {
                        const isSelected = selectedTopic?.id === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTopic(t)}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border bg-bg hover:border-primary/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text truncate">{t.label}</p>
                                {t.week && <span className="text-[10px] text-muted">Week {t.week}</span>}
                              </div>
                              <div className="flex flex-wrap gap-1 shrink-0">
                                {t.examStandards.slice(0, 2).map((s) => (
                                  <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
                                ))}
                                {t.misconceptions.length > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    {t.misconceptions.length} pitfalls
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && t.description && (
                              <p className="text-xs text-text-2 mt-1.5 leading-relaxed">{t.description}</p>
                            )}
                            {isSelected && t.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {t.keywords.slice(0, 6).map((k) => (
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 bg-border/30 text-text-2 rounded">{k}</span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingTopics && !topicsError && topics.length === 0 && subject && classLevel && (
              <div className="py-6 text-center text-sm text-muted">
                <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
                Select a subject to load curriculum topics
              </div>
            )}
          </div>

          {selectedTopic && (
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Configure Generation <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: CONFIGURE ── */}
      {step === 2 && selectedTopic && (
        <div className="space-y-5">
          {/* Selected topic summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <Brain size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text">{selectedTopic.label}</p>
              <p className="text-xs text-text-2">{subject} · {classLevel} · {selectedTopic.term ? `${selectedTopic.term.charAt(0) + selectedTopic.term.slice(1).toLowerCase()} Term` : "All Terms"}</p>
              <div className="flex gap-2 mt-1.5">
                <span className="text-[10px] text-muted">{selectedTopic.bloomLevels.join(", ")}</span>
                {selectedTopic.misconceptions.length > 0 && (
                  <span className="text-[10px] text-orange-500">{selectedTopic.misconceptions.length} misconceptions will be used as distractors</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
            <h2 className="font-semibold text-text">Configure Question Generation</h2>

            {/* Count */}
            <div>
              <label className="block text-xs font-medium text-text-2 mb-2">
                Number of MCQ Questions
              </label>
              <div className="flex gap-2 flex-wrap">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`w-14 h-10 rounded-lg text-sm font-bold border transition-colors ${
                      count === n
                        ? "bg-primary text-white border-primary"
                        : "bg-bg text-text-2 border-border hover:border-primary/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-1.5">Minimum 5, maximum 40 per generation</p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-medium text-text-2 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DIFFICULTIES.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setDifficulty(value)}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                      difficulty === value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-bg hover:border-primary/30"
                    }`}
                  >
                    <p className={`text-xs font-bold ${difficulty === value ? "text-primary" : "text-text"}`}>{label}</p>
                    <p className="text-[10px] text-muted mt-0.5 leading-tight">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CIG intelligence preview */}
            <div className="bg-bg border border-border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                <FlaskConical size={11} /> CIG Intelligence that will be injected into this generation
              </p>
              {selectedTopic.misconceptions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-text-2 mb-1">Misconceptions → Distractors</p>
                  <ul className="space-y-0.5">
                    {selectedTopic.misconceptions.slice(0, 3).map((m, i) => (
                      <li key={i} className="text-[11px] text-text-2 flex gap-1.5">
                        <span className="text-orange-500 shrink-0">✗</span> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedTopic.keywords.length > 0 && (
                <p className="text-[11px] text-text-2">
                  <span className="font-semibold">Key terms:</span> {selectedTopic.keywords.slice(0, 6).join(", ")}
                </p>
              )}
              {selectedTopic.examStandards.length > 0 && (
                <p className="text-[11px] text-text-2">
                  <span className="font-semibold">Aligned to:</span> {selectedTopic.examStandards.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-text-2 hover:border-primary/40 transition-colors"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!step2Valid}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              <Sparkles size={15} />
              Generate {count} Questions
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW & SAVE ── */}
      {step === 3 && (
        <div className="space-y-5">
          {generating && (
            <div className="bg-surface border border-border rounded-xl p-10 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-primary mx-auto" />
              <p className="text-sm font-semibold text-text">
                Generating {count} questions from CIG…
              </p>
              <p className="text-xs text-muted">
                Using curriculum misconceptions, exam standards, and bloom levels
              </p>
            </div>
          )}

          {genError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{genError}</p>
                <button onClick={() => { setStep(2); setGenError(""); }} className="text-xs text-red-600 dark:text-red-400 underline mt-1">
                  Go back and try again
                </button>
              </div>
            </div>
          )}

          {!generating && questions.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle size={18} className="text-success shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text">
                    {questions.length} questions generated from {selectedTopic?.label}
                  </p>
                  <p className="text-xs text-text-2">
                    {difficulty} difficulty · CIG-anchored · {subject} {classLevel}
                  </p>
                </div>
              </div>

              {/* Question preview list */}
              <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
                {questions.map((q, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                      className="w-full text-left px-4 py-3 hover:bg-bg transition-colors flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text leading-snug line-clamp-2">
                          <MathText text={q.stem} />
                        </p>
                        <div className="flex gap-2 mt-1">
                          {q.correctOption && (
                            <span className="text-[10px] font-bold text-success">Ans: {q.correctOption}</span>
                          )}
                          {q.bloomLevel && (
                            <span className="text-[10px] text-purple-500">{q.bloomLevel}</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedQ === i && (
                      <div className="px-4 pb-4 space-y-2 bg-bg/50">
                        <div className="grid grid-cols-2 gap-2">
                          {(["A", "B", "C", "D"] as const).map((opt) => {
                            const val = q[`option${opt}` as keyof typeof q] as string | undefined;
                            if (!val) return null;
                            const isCorrect = q.correctOption === opt;
                            return (
                              <div key={opt} className={`text-xs px-3 py-1.5 rounded-lg border ${isCorrect ? "border-success/30 bg-success/5 text-success font-medium" : "border-border text-text-2"}`}>
                                <span className="font-bold mr-1">{opt}.</span>{val}
                              </div>
                            );
                          })}
                        </div>
                        {q.solution && (
                          <div className="text-xs text-text-2 bg-bg border border-border rounded-lg px-3 py-2">
                            <span className="font-semibold text-text">Solution: </span>
                            {q.solution}
                          </div>
                        )}
                        {q.examTip && (
                          <p className="text-[11px] text-warning">Tip: {q.examTip}</p>
                        )}
                        {q.commonMistakes && (
                          <p className="text-[11px] text-orange-500">Common mistake: {q.commonMistakes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save panel */}
              {!savedExamId ? (
                <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-text text-sm">Save Questions to Exam</h3>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSaveMode("existing")}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        saveMode === "existing"
                          ? "bg-primary text-white border-primary"
                          : "bg-bg border-border text-text-2"
                      }`}
                    >
                      Add to Existing Exam
                    </button>
                    <button
                      onClick={() => setSaveMode("new")}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        saveMode === "new"
                          ? "bg-primary text-white border-primary"
                          : "bg-bg border-border text-text-2"
                      }`}
                    >
                      <Plus size={12} className="inline mr-1" />
                      Create New Exam
                    </button>
                  </div>

                  {saveMode === "existing" ? (
                    <select
                      value={targetExamId}
                      onChange={(e) => setTargetExamId(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select an exam…</option>
                      {exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.title} ({ex.questionCount} questions)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newExamTitle}
                      onChange={(e) => setNewExamTitle(e.target.value)}
                      placeholder={`${subject} — ${selectedTopic?.label ?? "AI Generated"}`}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}

                  {genError && (
                    <p className="text-xs text-danger flex items-center gap-1">
                      <AlertCircle size={12} /> {genError}
                    </p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving || (saveMode === "existing" && !targetExamId) || (saveMode === "new" && !newExamTitle.trim())}
                    className="w-full flex items-center justify-center gap-2 bg-success text-white py-3 rounded-lg text-sm font-bold hover:bg-success/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <><Loader2 size={15} className="animate-spin" /> Saving {questions.length} questions…</>
                    ) : (
                      <>Save {questions.length} Questions</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-success/5 border border-success/20 rounded-xl p-6 text-center space-y-3">
                  <CheckCircle size={32} className="text-success mx-auto" />
                  <p className="text-sm font-bold text-text">
                    {questions.length} questions saved successfully!
                  </p>
                  <button
                    onClick={() => router.push(`/exams/${savedExamId}`)}
                    className="flex items-center gap-2 mx-auto bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
                  >
                    View Exam <ArrowRight size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep(2); setQuestions([]); setSavedExamId(""); setGenError(""); }}
                  className="flex items-center gap-1.5 text-text-2 hover:text-text transition-colors"
                >
                  <ChevronLeft size={14} /> Regenerate with different settings
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
