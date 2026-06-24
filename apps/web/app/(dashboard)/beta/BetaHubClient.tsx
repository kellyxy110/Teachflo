"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical, CheckCircle, Bug, Lightbulb, Star, Trophy,
  BookOpen, ClipboardList, ChevronDown, ChevronRight,
  ExternalLink, RotateCcw, Send, AlertCircle, Sparkles,
  Monitor, Smartphone, Moon,
} from "lucide-react";

// ── Storage keys ──────────────────────────────────────────────────
const CHECKLIST_KEY = "tf_beta_checklist";
const SCORES_KEY = "tf_beta_scores";
const BUGS_KEY = "tf_beta_bugs";
const FEATURES_KEY = "tf_beta_features";

// ── Checklist tasks ───────────────────────────────────────────────
type ChecklistGroup = {
  group: string;
  emoji: string;
  tasks: { id: string; label: string; link?: string; tab?: string }[];
};

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    group: "AI Content Generation",
    emoji: "🧠",
    tasks: [
      { id: "gen_lesson_basic", label: "Generate a Lesson Note (any topic)", link: "/lessons/new" },
      { id: "gen_lesson_double", label: "Generate a Double-Period Lesson (set Periods = 2)", link: "/lessons/new" },
      { id: "gen_lesson_math", label: "Generate a Mathematics Lesson (any SS class)", link: "/lessons/new" },
      { id: "gen_lesson_science", label: "Generate a Science Lesson (Physics / Chemistry / Biology)", link: "/lessons/new" },
    ],
  },
  {
    group: "Exam & Assessment",
    emoji: "📋",
    tasks: [
      { id: "create_exam", label: "Create an Exam with MCQ + Theory Questions", link: "/exams/new" },
      { id: "test_adaptive", label: "Take an Adaptive Exam (open an exam → click Take Exam)", link: "/exams" },
    ],
  },
  {
    group: "Knowledge & Study",
    emoji: "📚",
    tasks: [
      { id: "upload_knowledge", label: "Upload a PDF to Knowledge Studio", link: "/knowledge-studio" },
      { id: "gen_flashcards", label: "Generate Flashcards from a document", link: "/knowledge-studio" },
      { id: "gen_quiz", label: "Generate Quiz Questions from Knowledge Studio", link: "/knowledge-studio" },
      { id: "use_study_buddy", label: "Use Study Buddy to explain a topic", link: "/study-buddy" },
    ],
  },
  {
    group: "School Management",
    emoji: "🏫",
    tasks: [
      { id: "create_class", label: "Create a Class", link: "/classes" },
      { id: "add_students", label: "Add Students to a Class", link: "/students" },
      { id: "enter_scores", label: "Enter Student Scores", link: "/scores" },
      { id: "create_homework", label: "Create a Homework Assignment", link: "/homework" },
    ],
  },
  {
    group: "Intelligence & Analytics",
    emoji: "📊",
    tasks: [
      { id: "view_analytics", label: "Explore the Analytics Dashboard", link: "/analytics" },
      { id: "view_intelligence", label: "Explore Intelligence Core", link: "/intelligence" },
    ],
  },
  {
    group: "Experience Testing",
    emoji: "🎨",
    tasks: [
      { id: "test_dark_mode", label: "Toggle Dark Mode & verify all screens look correct" },
      { id: "test_mobile", label: "Resize browser to mobile width and test responsiveness" },
      { id: "report_bug", label: "Submit at least one Bug Report", tab: "bugs" },
    ],
  },
];

const ALL_TASKS = CHECKLIST_GROUPS.flatMap((g) => g.tasks);

// ── Feature Testing Guide ─────────────────────────────────────────
type Module = {
  id: string;
  name: string;
  emoji: string;
  purpose: string;
  steps: string[];
  expected: string;
  questions: string[];
  link: string;
};

const MODULES: Module[] = [
  {
    id: "lesson-gen",
    name: "AI Lesson Generator",
    emoji: "📝",
    purpose: "Generate complete, classroom-ready lesson notes for any subject, class level, and topic — aligned with the Nigerian national curriculum and WAEC syllabus.",
    steps: [
      "Click 'Lessons' in the sidebar, then 'New Lesson'.",
      "Select a Subject (e.g., Mathematics), Class (e.g., SS2), Term, and Week.",
      "Set Periods to 1 for a single lesson, or 2 for a double period.",
      "Enter a specific topic (e.g., 'Quadratic Equations by factorisation').",
      "Click 'Generate Lesson Plan' and watch the lesson stream in real time.",
      "Try generating a lesson for a different subject and compare quality.",
      "Test the Copy and Save Lesson buttons.",
    ],
    expected: "A complete lesson note with: Learning Objectives, Entry Behaviour, Introduction, Main Teaching Content (with examples), Class Activities, Evaluation Questions, Homework, and WAEC/Exam Connection. The note should be at least 1,200 words.",
    questions: [
      "Was the lesson note content accurate for your subject?",
      "Was the depth and detail appropriate for the class level selected?",
      "Were the Nigerian analogies and examples relevant and realistic?",
      "Was anything important missing that you would expect in a real lesson note?",
      "Would you use this lesson note directly in your classroom?",
      "How does the double-period lesson (2 periods) differ from a single period? Is the structure logical?",
    ],
    link: "/lessons/new",
  },
  {
    id: "lesson-rewrite",
    name: "Lesson Rewriter (WAEC/JAMB/ELI12)",
    emoji: "🔄",
    purpose: "Transform a generated lesson note into different teaching modes: WAEC exam preparation, JAMB-focused drilling, ELI12 (simplified for struggling students), or JUPEB pre-degree level.",
    steps: [
      "Generate or open any existing lesson note.",
      "Look for the rewrite mode buttons (WAEC, JAMB, ELI12, JUPEB).",
      "Click 'WAEC Mode' and review how the lesson is transformed.",
      "Try 'ELI12 Mode' — it should simplify content significantly for weaker students.",
      "Compare the original lesson with the rewritten versions.",
    ],
    expected: "Each rewrite mode produces a distinctly different version: WAEC uses official exam language and past-question patterns; JAMB strips to high-yield MCQ facts; ELI12 simplifies everything with Nigerian analogies; JUPEB adds university-level depth.",
    questions: [
      "Was the WAEC rewrite truly exam-ready with proper mark scheme language?",
      "Was the ELI12 version simple enough for struggling students to follow?",
      "Was the JAMB version focused enough on high-yield facts?",
      "Would you actually use these rewrite modes to prepare students for exams?",
    ],
    link: "/lessons",
  },
  {
    id: "exam-builder",
    name: "Smart Exam Builder",
    emoji: "📋",
    purpose: "Create complete examination papers with MCQ, Theory, and Advanced questions — each with model answers, mark schemes, and distractor analysis.",
    steps: [
      "Click 'Exams' in the sidebar, then 'New Exam'.",
      "Select a subject, class level, exam type (e.g., WAEC Mock), and difficulty.",
      "Set the number of MCQ and Theory questions.",
      "Click generate and review the full exam paper.",
      "Check the mark scheme for each question.",
      "Test the distractor analysis — it should explain why wrong answers are tempting.",
      "Try creating a JAMB Prep exam and compare it to a School Test.",
    ],
    expected: "A complete exam paper with: properly formatted questions, 4-option MCQs with correct answers, Theory questions with full mark schemes, per-question exam tips, curriculum references, and distractor analysis explaining why each wrong option is attractive.",
    questions: [
      "Were the MCQ questions at the right difficulty level for the class selected?",
      "Were the distractors (wrong options) realistic — not obviously wrong?",
      "Were the mark schemes detailed enough to use for actual marking?",
      "Was the curriculum alignment correct for WAEC/JAMB?",
      "How many of these questions would you use directly without modification?",
    ],
    link: "/exams/new",
  },
  {
    id: "adaptive-exam",
    name: "Adaptive Exam Engine",
    emoji: "🎯",
    purpose: "An exam engine that adapts difficulty in real time based on student performance — getting harder when answered correctly and easier when struggling.",
    steps: [
      "Create an exam or open an existing one.",
      "Click 'Take Exam' to enter student exam mode.",
      "Answer questions — try deliberately getting some wrong.",
      "Notice how the difficulty adjusts across questions.",
      "Complete the exam and review the results page.",
      "Check the mistake analysis and topic breakdown in the results.",
    ],
    expected: "An interactive exam where difficulty changes based on answers. The results page should show: score breakdown by topic, a Bloom's Taxonomy performance chart, identified weak areas, and a recommended study path.",
    questions: [
      "Did the difficulty feel like it was adapting based on your answers?",
      "Was the timer and exam interface comfortable to use?",
      "Was the results analysis detailed enough to identify what a student needs to work on?",
      "Would students find this exam format engaging?",
    ],
    link: "/exams",
  },
  {
    id: "study-buddy",
    name: "Study Buddy AI Tutor",
    emoji: "🤖",
    purpose: "A personal AI tutor that explains concepts, tests understanding, gives step-by-step guidance, and adapts to each student's weak topics.",
    steps: [
      "Click 'Study Buddy' in the sidebar.",
      "Select a subject and enter a topic or question.",
      "Test the 'Explain' mode — it should explain clearly with Nigerian analogies.",
      "Test 'Test Me' — it should generate a practice question and evaluate your answer.",
      "Test 'Step-by-Step' for a mathematical or scientific process.",
      "Test 'Hint' mode — it should give guidance without fully solving the problem.",
      "Ask a follow-up question and see how the conversation flows.",
    ],
    expected: "A conversational AI tutor that maintains context, uses appropriate Nigerian analogies, gives clear step-by-step explanations, and provides targeted practice questions. It should feel like a knowledgeable senior student.",
    questions: [
      "Were the explanations clear and at the right level for Nigerian SS students?",
      "Were the Nigerian analogies and examples relatable?",
      "Was the Step-by-Step mode detailed enough for exam preparation?",
      "How does it compare to asking a teacher directly?",
      "Would students actually enjoy using this on their own?",
    ],
    link: "/study-buddy",
  },
  {
    id: "knowledge-studio",
    name: "Knowledge Studio",
    emoji: "🔬",
    purpose: "Upload school documents, past exam papers, or syllabi. TeachFlow extracts knowledge to create flashcards, quiz questions, and AI-augmented study materials.",
    steps: [
      "Click 'Knowledge Studio' in the sidebar.",
      "Upload a PDF document (a past paper, textbook chapter, or syllabus).",
      "Wait for the document to be processed.",
      "Click 'Generate Flashcards' from the uploaded document.",
      "Review the flashcards — are they accurate and useful?",
      "Try generating Quiz Questions from the same document.",
    ],
    expected: "Flashcards that capture key concepts from the uploaded document. Quiz questions that test knowledge from the actual content. Questions should be contextually grounded in the uploaded material, not generic.",
    questions: [
      "Was the document upload process smooth?",
      "Were the flashcards generated accurate and useful?",
      "Were the quiz questions relevant to the content uploaded?",
      "What types of documents would you most want to upload?",
    ],
    link: "/knowledge-studio",
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    emoji: "📊",
    purpose: "School-wide performance analytics that identify which students are struggling, which subjects are weak, and what interventions are needed.",
    steps: [
      "Click 'Analytics' in the sidebar.",
      "Review the overview metrics (if you have entered scores).",
      "Look for the at-risk student identification section.",
      "Check subject performance breakdown if available.",
      "Navigate between different time periods or classes.",
    ],
    expected: "A visual dashboard with charts showing: class average scores, subject performance comparison, top/bottom performers, at-risk student flags, and grade distribution histograms.",
    questions: [
      "Is the analytics dashboard immediately understandable without training?",
      "Are the at-risk student flags useful for early intervention?",
      "What additional analytics would you want to see?",
      "How would you use this in a parent-teacher meeting?",
    ],
    link: "/analytics",
  },
  {
    id: "intelligence",
    name: "Intelligence Core",
    emoji: "🧬",
    purpose: "The self-improving education engine: Mistake Intelligence detects recurring error patterns, Adaptive Learning generates personalised study paths, and the Curriculum Generator produces term plans.",
    steps: [
      "Click 'Intelligence' in the sidebar.",
      "Explore the Mistake Intelligence section — review detected error patterns.",
      "Check the Learning Paths section for any generated student paths.",
      "Try the Curriculum Generator — input a class and term to generate a term plan.",
    ],
    expected: "Actionable insights about where students are going wrong. Personalised study paths that sequence topics to fill knowledge gaps. A comprehensive term curriculum plan aligned to the WAEC syllabus.",
    questions: [
      "Were the mistake patterns identified realistic and accurate?",
      "Would the learning paths be practical for your students to follow?",
      "Was the curriculum plan well-structured and syllabus-aligned?",
      "How would you integrate this into your weekly teaching routine?",
    ],
    link: "/intelligence",
  },
  {
    id: "class-management",
    name: "Class Management",
    emoji: "🏫",
    purpose: "Create and manage your classes — from JSS1 to SS3. Each class has its own student list, performance analytics, and assignment tracking.",
    steps: [
      "Click 'Classes' in the sidebar.",
      "Click 'New Class' and create a class (e.g., SS2A).",
      "Open the class and explore what information is available.",
      "Try filtering or searching if you have multiple classes.",
    ],
    expected: "A clean class management interface showing all classes with student counts, recent activity, and quick access to class-specific analytics and homework.",
    questions: [
      "Was the class creation process intuitive?",
      "Is the class overview page informative at a glance?",
      "What class management features are missing that you use in your school?",
    ],
    link: "/classes",
  },
  {
    id: "student-management",
    name: "Student Management",
    emoji: "👩‍🎓",
    purpose: "Register and manage student profiles, track their academic history, and view individual performance analytics.",
    steps: [
      "Click 'Students' in the sidebar.",
      "Add a new student — fill in name, class, and registration number.",
      "Open a student's profile and explore their performance tab.",
      "Test the Smart Import feature if you have a student list spreadsheet.",
    ],
    expected: "A student management system where each student has a profile with: personal details, class assignment, score history, and an AI-generated performance summary.",
    questions: [
      "Was the student addition process quick and smooth?",
      "Is the student profile page useful for tracking individual progress?",
      "Would you want to import students from your existing records? How do you currently store them?",
    ],
    link: "/students",
  },
  {
    id: "scores-homework",
    name: "Scores & Homework",
    emoji: "📌",
    purpose: "Enter class scores quickly, track homework assignments, and automatically calculate grades using the Nigerian grading scale.",
    steps: [
      "Click 'Scores' in the sidebar — enter scores for a class.",
      "Verify that grades are calculated correctly (A: 70+, B: 60–69, C: 50–59, D: 45–49, E: 40–44, F: below 40).",
      "Click 'Homework' in the sidebar — create a new assignment.",
      "Set a due date and add instructions.",
    ],
    expected: "A fast score entry form with automatic grade calculation. Homework creation with description, due date, and class assignment. Both should be fast to complete (under 2 minutes for a full class).",
    questions: [
      "How long did it take to enter scores for one class? Is that fast enough?",
      "Were the grade calculations correct?",
      "What homework features are missing (e.g., student submission, grading)?",
    ],
    link: "/scores",
  },
  {
    id: "code-lab",
    name: "Code Lab",
    emoji: "💻",
    purpose: "An interactive coding environment teaching HTML, CSS, JavaScript, and Python — with 54 guided lessons from beginner to advanced.",
    steps: [
      "Click 'Code Lab' in the sidebar.",
      "Select HTML and try the first 3 lessons.",
      "Try a Python lesson (intermediate or advanced).",
      "Test the 'Run Code' validation — try submitting wrong code to see the error message.",
      "Try the Hint and Solution buttons.",
    ],
    expected: "An in-browser coding environment where students write real code, get instant validation feedback, and progress through structured lessons. Suitable for Computer Studies classes.",
    questions: [
      "Was the code editor comfortable to type in?",
      "Were the lesson instructions clear enough for students to follow without teacher help?",
      "Were the error messages helpful (do they guide students toward the correct answer)?",
      "Would you use this for your Computer Studies lessons?",
    ],
    link: "/code-lab",
  },
];

// ── Scorecard features ────────────────────────────────────────────
const SCORE_FEATURES = [
  { id: "lesson_gen", label: "Lesson Generator", emoji: "📝" },
  { id: "exam_builder", label: "Exam Builder", emoji: "📋" },
  { id: "study_buddy", label: "Study Buddy", emoji: "🤖" },
  { id: "knowledge_studio", label: "Knowledge Studio", emoji: "🔬" },
  { id: "analytics", label: "Analytics Dashboard", emoji: "📊" },
  { id: "intelligence", label: "Intelligence Core", emoji: "🧬" },
  { id: "ui_design", label: "UI Design & Layout", emoji: "🎨" },
  { id: "speed", label: "Speed & Performance", emoji: "⚡" },
  { id: "ease_of_use", label: "Ease of Use", emoji: "🤝" },
  { id: "curriculum_align", label: "Curriculum Alignment", emoji: "📚" },
];

type BugReport = {
  id: string;
  feature: string;
  issue: string;
  expected: string;
  actual: string;
  steps: string;
  device: string;
  browser: string;
  severity: string;
  submittedAt: string;
};

type FeatureRequest = {
  id: string;
  indispensable: string;
  frustration: string;
  timeSaver: string;
  studentDelight: string;
  parentDelight: string;
  submittedAt: string;
};

type Tab = "overview" | "guide" | "checklist" | "bugs" | "features" | "scorecard" | "completion";

function useLocalState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(defaultValue);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, [key]);
  function set(v: T) {
    setState(v);
    localStorage.setItem(key, JSON.stringify(v));
  }
  return [state, set] as const;
}

// ── Main Component ────────────────────────────────────────────────
export function BetaHubClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [checklist, setChecklist] = useLocalState<Record<string, boolean>>(CHECKLIST_KEY, {});
  const [scores, setScores] = useLocalState<Record<string, number>>(SCORES_KEY, {});
  const [bugs, setBugs] = useLocalState<BugReport[]>(BUGS_KEY, []);
  const [features, setFeatures] = useLocalState<FeatureRequest[]>(FEATURES_KEY, []);

  // Bug form state
  const [bugForm, setBugForm] = useState({ feature: "", issue: "", expected: "", actual: "", steps: "", device: "Desktop", browser: "Chrome", severity: "Medium" });
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // Feature form state
  const [featForm, setFeatForm] = useState({ indispensable: "", frustration: "", timeSaver: "", studentDelight: "", parentDelight: "" });
  const [featSubmitted, setFeatSubmitted] = useState(false);

  // Scorecard state
  const [scorecardSubmitted, setScorecardSubmitted] = useState(false);

  const completedCount = ALL_TASKS.filter((t) => checklist[t.id]).length;
  const completionPct = Math.round((completedCount / ALL_TASKS.length) * 100);
  const avgScore = SCORE_FEATURES.length > 0
    ? Object.values(scores).length > 0
      ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
      : 0
    : 0;

  function toggleTask(id: string) {
    setChecklist({ ...checklist, [id]: !checklist[id] });
  }

  function submitBug() {
    if (!bugForm.feature || !bugForm.issue) return;
    const report: BugReport = { ...bugForm, id: Date.now().toString(), submittedAt: new Date().toISOString() };
    const updated = [...bugs, report];
    setBugs(updated);
    setBugForm({ feature: "", issue: "", expected: "", actual: "", steps: "", device: "Desktop", browser: "Chrome", severity: "Medium" });
    setBugSubmitted(true);
    // Mark bug task complete
    setChecklist({ ...checklist, report_bug: true });
    setTimeout(() => setBugSubmitted(false), 3000);
  }

  function submitFeature() {
    if (!featForm.indispensable) return;
    const req: FeatureRequest = { ...featForm, id: Date.now().toString(), submittedAt: new Date().toISOString() };
    setFeatures([...features, req]);
    setFeatForm({ indispensable: "", frustration: "", timeSaver: "", studentDelight: "", parentDelight: "" });
    setFeatSubmitted(true);
    setTimeout(() => setFeatSubmitted(false), 3000);
  }

  function submitScorecard() {
    setScorecardSubmitted(true);
    setTimeout(() => setScorecardSubmitted(false), 3000);
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Sparkles size={15} /> },
    { id: "guide", label: "Testing Guide", icon: <BookOpen size={15} /> },
    { id: "checklist", label: "Checklist", icon: <CheckCircle size={15} /> },
    { id: "bugs", label: "Bug Report", icon: <Bug size={15} /> },
    { id: "features", label: "Feature Ideas", icon: <Lightbulb size={15} /> },
    { id: "scorecard", label: "Rate Features", icon: <Star size={15} /> },
    { id: "completion", label: "Completion", icon: <Trophy size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <FlaskConical size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">Beta Testing Hub</h1>
              <p className="text-sm text-text-2 mt-0.5">Pioneer Educator Programme · TeachFlow OS v1.0</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">{completionPct}%</p>
            <p className="text-xs text-muted">complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-text-2 mb-1.5">
            <span>{completedCount}/{ALL_TASKS.length} tasks completed</span>
            <span>{bugs.length} bugs · {features.length} ideas</span>
          </div>
          <div className="h-2.5 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100 ? "#10b981" : "var(--color-primary, #3b82f6)",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted mt-1">
            {[0, 25, 50, 75, 100].map((n) => (
              <span key={n} className={completionPct >= n ? "text-primary font-bold" : ""}>{n}%</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto bg-surface border border-border rounded-xl p-1.5">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              tab === id
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:bg-bg hover:text-text"
            }`}
          >
            {icon}
            {label}
            {id === "bugs" && bugs.length > 0 && (
              <span className="bg-danger/20 text-danger text-[10px] px-1.5 py-0.5 rounded-full ml-0.5">{bugs.length}</span>
            )}
            {id === "checklist" && completedCount > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full ml-0.5">{completedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-text mb-2">Welcome, Pioneer Educator 🎉</h2>
            <p className="text-sm text-text-2 leading-relaxed mb-4">
              You are among a select group of Nigerian teachers who will shape TeachFlow OS before it
              launches publicly. Your testing time — your feedback on what works, what doesn't, and what's
              missing — is the most valuable contribution you can make to Nigerian education technology.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { emoji: "⏱️", label: "60–90 min", desc: "suggested testing time" },
                { emoji: "🧪", label: "18 tasks", desc: "in the checklist" },
                { emoji: "🔬", label: "12 modules", desc: "to explore" },
                { emoji: "🏆", label: "Advisory Circle", desc: "reward for 100%" },
              ].map(({ emoji, label, desc }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{emoji}</div>
                  <p className="text-sm font-bold text-text">{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-warning" />
                Areas Needing Your Attention
              </h3>
              <ul className="space-y-2">
                {[
                  "Lesson note quality and word count",
                  "Exam question accuracy and difficulty calibration",
                  "Study Buddy explanation clarity",
                  "Mobile responsiveness across all pages",
                  "Dark mode consistency",
                  "WAEC/JAMB curriculum alignment",
                  "Speed of AI responses",
                ].map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm text-text-2">
                    <span className="w-1.5 h-1.5 bg-warning rounded-full shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                <ClipboardList size={16} className="text-primary" />
                How to Use This Hub
              </h3>
              <ol className="space-y-2">
                {[
                  { tab: "guide" as Tab, label: "Read the Testing Guide for each module" },
                  { tab: "checklist" as Tab, label: "Complete the 18-task Checklist" },
                  { tab: "bugs" as Tab, label: "Report any bugs you find" },
                  { tab: "features" as Tab, label: "Submit your feature ideas" },
                  { tab: "scorecard" as Tab, label: "Rate each feature 1–10" },
                  { tab: "completion" as Tab, label: "Claim your Pioneer status at 100%" },
                ].map(({ tab: t, label }, i) => (
                  <li key={label}>
                    <button
                      onClick={() => setTab(t)}
                      className="flex items-center gap-2 text-sm text-text-2 hover:text-primary transition-colors w-full text-left"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      {label}
                      <ChevronRight size={12} className="ml-auto" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold text-text mb-3">Quick Launch</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { emoji: "📝", label: "Generate Lesson", link: "/lessons/new" },
                { emoji: "📋", label: "Create Exam", link: "/exams/new" },
                { emoji: "🤖", label: "Study Buddy", link: "/study-buddy" },
                { emoji: "🔬", label: "Knowledge Studio", link: "/knowledge-studio" },
              ].map(({ emoji, label, link }) => (
                <Link
                  key={label}
                  href={link}
                  className="flex items-center gap-2 p-3 bg-bg rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-text font-medium"
                >
                  <span className="text-lg">{emoji}</span>
                  {label}
                  <ExternalLink size={11} className="ml-auto text-muted" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: TESTING GUIDE ── */}
      {tab === "guide" && (
        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-text-2">
              For each module below, follow the numbered steps, then answer the feedback questions honestly.
              Use the <strong className="text-text">Checklist tab</strong> to track what you've tested.
            </p>
          </div>

          {MODULES.map((mod) => {
            const isOpen = expandedModule === mod.id;
            return (
              <div key={mod.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-bg/50 transition-colors text-left"
                >
                  <span className="text-xl">{mod.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-text text-sm">{mod.name}</p>
                    <p className="text-xs text-text-2 mt-0.5 line-clamp-1">{mod.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={mod.link}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] px-2 py-1 border border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      Open →
                    </Link>
                    {isOpen ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-5 py-4 space-y-4 bg-bg/30">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Purpose</h4>
                      <p className="text-sm text-text-2 leading-relaxed">{mod.purpose}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-2">How to Test</h4>
                      <ol className="space-y-1.5">
                        {mod.steps.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-text-2">
                            <span className="w-5 h-5 bg-primary/10 text-primary rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Expected Outcome</h4>
                      <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                        <p className="text-sm text-text-2 leading-relaxed">{mod.expected}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Questions to Answer</h4>
                      <ul className="space-y-1.5">
                        {mod.questions.map((q, i) => (
                          <li key={i} className="flex gap-2 text-sm text-text-2">
                            <span className="text-primary shrink-0 mt-0.5">→</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: CHECKLIST ── */}
      {tab === "checklist" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-text">Testing Checklist</h2>
              <span className="text-sm font-bold text-primary">{completedCount}/{ALL_TASKS.length}</span>
            </div>
            <div className="h-3 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${completionPct}%`,
                  background: completionPct === 100 ? "#10b981" : "var(--color-primary, #3b82f6)",
                }}
              />
            </div>
            {completionPct === 100 && (
              <p className="text-success text-xs font-bold mt-2 text-center">
                🎉 All tasks complete! Visit the Completion tab to claim your Pioneer status.
              </p>
            )}
          </div>

          {CHECKLIST_GROUPS.map((group) => {
            const groupDone = group.tasks.filter((t) => checklist[t.id]).length;
            return (
              <div key={group.group} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg/30">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{group.emoji}</span>
                    <h3 className="font-semibold text-text text-sm">{group.group}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    groupDone === group.tasks.length
                      ? "bg-success/10 text-success"
                      : "bg-bg text-muted border border-border"
                  }`}>
                    {groupDone}/{group.tasks.length}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {group.tasks.map((task) => {
                    const done = checklist[task.id];
                    return (
                      <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-bg/30 transition-colors">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            done
                              ? "bg-success border-success text-white"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {done && <CheckCircle size={12} />}
                        </button>
                        <p className={`text-sm flex-1 ${done ? "line-through text-muted" : "text-text"}`}>
                          {task.label}
                        </p>
                        {task.link && (
                          <Link
                            href={task.link}
                            className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary/5 transition-colors shrink-0"
                            onClick={() => toggleTask(task.id)}
                          >
                            Go →
                          </Link>
                        )}
                        {task.tab && (
                          <button
                            onClick={() => { setTab(task.tab as Tab); toggleTask(task.id); }}
                            className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary/5 transition-colors shrink-0"
                          >
                            Go →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: BUG REPORT ── */}
      {tab === "bugs" && (
        <div className="space-y-4">
          {bugSubmitted && (
            <div className="flex items-center gap-2 bg-success/10 border border-success/30 text-success text-sm font-medium rounded-xl p-3">
              <CheckCircle size={16} /> Bug report submitted! Thank you.
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-bold text-text mb-1">Submit a Bug Report</h2>
            <p className="text-xs text-text-2 mb-5">Found something broken? Tell us exactly what happened.</p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Feature Tested *</label>
                  <select
                    value={bugForm.feature}
                    onChange={(e) => setBugForm({ ...bugForm, feature: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select feature...</option>
                    {MODULES.map((m) => <option key={m.id} value={m.name}>{m.emoji} {m.name}</option>)}
                    <option value="General UI">🎨 General UI</option>
                    <option value="Authentication">🔐 Authentication</option>
                    <option value="Other">❓ Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Severity</label>
                  <div className="flex gap-2">
                    {["Low", "Medium", "High", "Critical"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setBugForm({ ...bugForm, severity: s })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                          bugForm.severity === s
                            ? s === "Critical" ? "bg-red-600 text-white border-red-600"
                              : s === "High" ? "bg-orange-500 text-white border-orange-500"
                              : s === "Medium" ? "bg-amber-500 text-white border-amber-500"
                              : "bg-green-500 text-white border-green-500"
                            : "border-border text-text-2 hover:bg-bg"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Issue Found *</label>
                <textarea
                  value={bugForm.issue}
                  onChange={(e) => setBugForm({ ...bugForm, issue: e.target.value })}
                  rows={2}
                  placeholder="Describe the problem clearly in one or two sentences..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Expected Result</label>
                  <textarea
                    value={bugForm.expected}
                    onChange={(e) => setBugForm({ ...bugForm, expected: e.target.value })}
                    rows={2}
                    placeholder="What should have happened?"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Actual Result</label>
                  <textarea
                    value={bugForm.actual}
                    onChange={(e) => setBugForm({ ...bugForm, actual: e.target.value })}
                    rows={2}
                    placeholder="What actually happened?"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Steps to Reproduce</label>
                <textarea
                  value={bugForm.steps}
                  onChange={(e) => setBugForm({ ...bugForm, steps: e.target.value })}
                  rows={3}
                  placeholder="1. Go to...\n2. Click on...\n3. See error"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted font-mono"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Device</label>
                  <div className="flex gap-2">
                    {[
                      { v: "Desktop", icon: <Monitor size={14} /> },
                      { v: "Mobile", icon: <Smartphone size={14} /> },
                      { v: "Tablet", icon: <Monitor size={14} /> },
                    ].map(({ v, icon }) => (
                      <button
                        key={v}
                        onClick={() => setBugForm({ ...bugForm, device: v })}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                          bugForm.device === v ? "bg-primary/10 text-primary border-primary/30" : "border-border text-text-2 hover:bg-bg"
                        }`}
                      >
                        {icon} {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Browser</label>
                  <select
                    value={bugForm.browser}
                    onChange={(e) => setBugForm({ ...bugForm, browser: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {["Chrome", "Firefox", "Safari", "Edge", "Opera", "Samsung Internet", "Other"].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={submitBug}
                disabled={!bugForm.feature || !bugForm.issue}
                className="flex items-center gap-2 bg-danger text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-danger/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                Submit Bug Report
              </button>
            </div>
          </div>

          {/* Previous bugs */}
          {bugs.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold text-text mb-3">Your Submitted Reports ({bugs.length})</h3>
              <div className="space-y-2">
                {bugs.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 p-3 bg-bg rounded-xl border border-border">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${
                      b.severity === "Critical" ? "bg-red-100 text-red-700"
                        : b.severity === "High" ? "bg-orange-100 text-orange-700"
                        : b.severity === "Medium" ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}>{b.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text">{b.feature}</p>
                      <p className="text-xs text-text-2 truncate">{b.issue}</p>
                    </div>
                    <span className="text-[10px] text-muted shrink-0">{new Date(b.submittedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FEATURE REQUEST ── */}
      {tab === "features" && (
        <div className="space-y-4">
          {featSubmitted && (
            <div className="flex items-center gap-2 bg-success/10 border border-success/30 text-success text-sm font-medium rounded-xl p-3">
              <CheckCircle size={16} /> Feature request submitted! Your ideas will be reviewed.
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-bold text-text mb-1">Share Your Feature Ideas</h2>
            <p className="text-xs text-text-2 mb-5">
              These answers directly influence what gets built in the next version. Please be specific — the more concrete your idea, the more likely it gets built.
            </p>

            <div className="space-y-5">
              {[
                {
                  key: "indispensable" as const,
                  q: "What single feature would make TeachFlow completely indispensable to you?",
                  placeholder: "e.g. WhatsApp integration to send homework to students, or automatic WAEC timetable syncing...",
                },
                {
                  key: "frustration" as const,
                  q: "What currently frustrates you most about TeachFlow?",
                  placeholder: "Be honest — we need to know what's broken or missing...",
                },
                {
                  key: "timeSaver" as const,
                  q: "What task takes you the most time every week that TeachFlow should automate?",
                  placeholder: "e.g. Writing lesson notes, creating CA tests, tracking student performance...",
                },
                {
                  key: "studentDelight" as const,
                  q: "What would make your students genuinely excited to use TeachFlow?",
                  placeholder: "e.g. Leaderboards, instant feedback, gamified practice...",
                },
                {
                  key: "parentDelight" as const,
                  q: "What TeachFlow feature would delight parents most?",
                  placeholder: "e.g. Weekly SMS performance reports, homework notifications...",
                },
              ].map(({ key, q, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-text mb-2">{q}</label>
                  <textarea
                    value={featForm[key]}
                    onChange={(e) => setFeatForm({ ...featForm, [key]: e.target.value })}
                    rows={3}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted leading-relaxed"
                  />
                </div>
              ))}

              <button
                onClick={submitFeature}
                disabled={!featForm.indispensable}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Lightbulb size={14} />
                Submit Feature Ideas
              </button>
            </div>
          </div>

          {features.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold text-text mb-3">Your Submissions ({features.length})</h3>
              <div className="space-y-3">
                {features.map((f) => (
                  <div key={f.id} className="p-3 bg-bg rounded-xl border border-border">
                    <p className="text-xs font-semibold text-text">Indispensable feature:</p>
                    <p className="text-xs text-text-2 mt-0.5">{f.indispensable}</p>
                    <p className="text-[10px] text-muted mt-1">{new Date(f.submittedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SCORECARD ── */}
      {tab === "scorecard" && (
        <div className="space-y-4">
          {scorecardSubmitted && (
            <div className="flex items-center gap-2 bg-success/10 border border-success/30 text-success text-sm font-medium rounded-xl p-3">
              <CheckCircle size={16} /> Scorecard saved! Thank you for rating TeachFlow.
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-text">Feature Scorecard</h2>
              {Object.values(scores).length > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-black text-primary">{avgScore}<span className="text-sm text-muted font-normal">/10</span></p>
                  <p className="text-[10px] text-muted">average</p>
                </div>
              )}
            </div>
            <p className="text-xs text-text-2 mb-6">Rate each feature honestly from 1 (very poor) to 10 (outstanding).</p>

            <div className="space-y-5">
              {SCORE_FEATURES.map(({ id, label, emoji }) => {
                const val = scores[id] ?? 0;
                return (
                  <div key={id}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-text flex items-center gap-2">
                        <span>{emoji}</span> {label}
                      </label>
                      <span className={`text-sm font-bold w-8 text-right ${
                        val >= 8 ? "text-success" : val >= 5 ? "text-warning" : val > 0 ? "text-danger" : "text-muted"
                      }`}>
                        {val > 0 ? val : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setScores({ ...scores, [id]: n })}
                          className={`flex-1 h-8 rounded-md text-xs font-bold transition-all border ${
                            n <= val
                              ? val >= 8 ? "bg-success/20 text-success border-success/40"
                                : val >= 5 ? "bg-warning/20 text-warning border-warning/40"
                                : "bg-danger/20 text-danger border-danger/40"
                              : "bg-bg border-border text-muted hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={submitScorecard}
              disabled={Object.values(scores).length === 0}
              className="mt-6 flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Star size={14} />
              Save Scorecard
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: COMPLETION ── */}
      {tab === "completion" && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-8 text-center ${
            completionPct === 100
              ? "bg-gradient-to-br from-amber-400/10 to-orange-400/10 border-2 border-amber-400/40"
              : "bg-surface border border-border"
          }`}>
            <div className="text-5xl mb-4">{completionPct === 100 ? "🏆" : "🎯"}</div>
            <h2 className="text-2xl font-black text-text mb-2">
              {completionPct === 100 ? "Congratulations, Pioneer Educator!" : "Keep Going, Pioneer!"}
            </h2>
            <p className="text-text-2 text-sm max-w-md mx-auto mb-6">
              {completionPct === 100
                ? "You have completed the full TeachFlow Beta Testing Programme. Your contribution will help shape the future of education in Nigeria."
                : `You are ${completionPct}% through the testing programme. Complete all 18 tasks to earn your Pioneer Educator status.`}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { emoji: "✅", label: "Tasks Completed", value: `${completedCount}/${ALL_TASKS.length}` },
                { emoji: "🐛", label: "Bugs Reported", value: bugs.length },
                { emoji: "💡", label: "Ideas Submitted", value: features.length },
                { emoji: "⭐", label: "Average Score", value: avgScore > 0 ? `${avgScore}/10` : "—" },
              ].map(({ emoji, label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-2xl mb-1">{emoji}</div>
                  <p className="text-lg font-black text-text">{value}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>

            {completionPct === 100 ? (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-5">
                <h3 className="font-bold text-text mb-2">🎖️ You Are Invited to the Advisory Circle</h3>
                <p className="text-sm text-text-2 mb-3">
                  As a Pioneer Educator, you are being invited to join the TeachFlow Advisory Circle —
                  a group of founding teachers who will co-create the next major version of TeachFlow OS.
                  You will receive early access to new features, direct communication with the founding team,
                  and recognition as a founding contributor.
                </p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  📧 Watch your email for an invitation from the TeachFlow team.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-text mb-3">Remaining tasks:</p>
                {ALL_TASKS.filter((t) => !checklist[t.id]).slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm text-text-2 bg-bg rounded-lg p-2.5 border border-border">
                    <span className="w-4 h-4 border-2 border-border rounded shrink-0" />
                    {t.label}
                  </div>
                ))}
                {ALL_TASKS.filter((t) => !checklist[t.id]).length > 5 && (
                  <p className="text-xs text-muted text-center">
                    + {ALL_TASKS.filter((t) => !checklist[t.id]).length - 5} more
                  </p>
                )}
                <button
                  onClick={() => setTab("checklist")}
                  className="mt-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Go to Checklist →
                </button>
              </div>
            )}
          </div>

          {/* Reset option */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (confirm("Reset all testing progress? This cannot be undone.")) {
                  setChecklist({});
                  setScores({});
                  setBugs([]);
                  setFeatures([]);
                }
              }}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors"
            >
              <RotateCcw size={12} />
              Reset all progress
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
