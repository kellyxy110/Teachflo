"use client";

import { useState, useCallback } from "react";
import {
  Code2, Play, CheckCircle, XCircle, ChevronRight,
  Globe, Palette, Zap, Terminal, Lock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────
type Language = "html" | "css" | "javascript" | "python";
type Difficulty = "beginner" | "intermediate" | "advanced";

interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  instruction: string;
  starterCode: string;
  solution: string;
  validator: (code: string) => { pass: boolean; message: string };
  hint: string;
}

// ── Curriculum ───────────────────────────────────────────────────

const LANGUAGES: { id: Language; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: "html", label: "HTML", icon: <Globe size={20} />, color: "#e44d26", bg: "rgba(228,77,38,0.12)" },
  { id: "css", label: "CSS", icon: <Palette size={20} />, color: "#264de4", bg: "rgba(38,77,228,0.12)" },
  { id: "javascript", label: "JavaScript", icon: <Zap size={20} />, color: "#f7df1e", bg: "rgba(247,223,30,0.12)" },
  { id: "python", label: "Python", icon: <Terminal size={20} />, color: "#3776ab", bg: "rgba(55,118,171,0.12)" },
];

const DIFF_LABELS: Record<Difficulty, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "#10b981" },
  intermediate: { label: "Intermediate", color: "#f59e0b" },
  advanced: { label: "Advanced", color: "#ef4444" },
};

const CURRICULUM: Record<Language, Lesson[]> = {
  html: [
    {
      id: "html-1",
      title: "Your First Heading",
      description: "Learn the <h1> tag — the most important heading on a page.",
      difficulty: "beginner",
      instruction: "Create a heading that says \"Hello World\" using the <h1> tag.",
      starterCode: "<!-- Write your heading below -->\n",
      solution: "<h1>Hello World</h1>",
      validator: (code) => {
        const has = /<h1[^>]*>.*Hello\s*World.*<\/h1>/i.test(code);
        return { pass: has, message: has ? "Your heading is showing!" : "Use <h1>Hello World</h1>" };
      },
      hint: "Wrap your text with <h1> and </h1> tags.",
    },
    {
      id: "html-2",
      title: "Paragraphs",
      description: "The <p> tag creates a paragraph of text.",
      difficulty: "beginner",
      instruction: "Create a paragraph that says \"I am learning HTML\".",
      starterCode: "<h1>My Page</h1>\n<!-- Add a paragraph below -->\n",
      solution: "<h1>My Page</h1>\n<p>I am learning HTML</p>",
      validator: (code) => {
        const has = /<p[^>]*>.*I am learning HTML.*<\/p>/i.test(code);
        return { pass: has, message: has ? "Paragraph created!" : "Use the <p> tag for paragraphs." };
      },
      hint: "Use <p>Your text here</p>",
    },
    {
      id: "html-3",
      title: "Links",
      description: "The <a> tag creates clickable links using the href attribute.",
      difficulty: "beginner",
      instruction: "Create a link that says \"Visit Google\" and points to https://google.com.",
      starterCode: "<!-- Create a link below -->\n",
      solution: '<a href="https://google.com">Visit Google</a>',
      validator: (code) => {
        const has = /<a\s+href=["']https?:\/\/google\.com["'][^>]*>.*Visit Google.*<\/a>/i.test(code);
        return { pass: has, message: has ? "Link works!" : 'Use <a href="https://google.com">Visit Google</a>' };
      },
      hint: 'Links need an href attribute: <a href="url">text</a>',
    },
    {
      id: "html-4",
      title: "Lists",
      description: "Create ordered and unordered lists with <ul>, <ol>, and <li>.",
      difficulty: "intermediate",
      instruction: "Create an unordered list with three items: Mathematics, Physics, Chemistry.",
      starterCode: "<!-- Create a list of subjects -->\n",
      solution: "<ul>\n  <li>Mathematics</li>\n  <li>Physics</li>\n  <li>Chemistry</li>\n</ul>",
      validator: (code) => {
        const hasUl = /<ul/i.test(code);
        const items = (code.match(/<li/gi) || []).length;
        const pass = hasUl && items >= 3;
        return { pass, message: pass ? "Great list!" : `Need a <ul> with 3 <li> items. Found ${items}.` };
      },
      hint: "Wrap <li> items inside a <ul> tag.",
    },
    {
      id: "html-5",
      title: "Forms & Inputs",
      description: "Build interactive forms with <form>, <input>, and <button>.",
      difficulty: "advanced",
      instruction: "Create a form with a text input (name=\"email\", placeholder=\"Enter email\") and a submit button.",
      starterCode: "<!-- Build a form -->\n",
      solution: '<form>\n  <input type="text" name="email" placeholder="Enter email" />\n  <button type="submit">Submit</button>\n</form>',
      validator: (code) => {
        const hasForm = /<form/i.test(code);
        const hasInput = /name=["']email["']/i.test(code);
        const hasBtn = /<button/i.test(code);
        const pass = hasForm && hasInput && hasBtn;
        return { pass, message: pass ? "Form built!" : "Need a <form> with an input (name=\"email\") and a button." };
      },
      hint: 'Use <input type="text" name="email" /> inside a <form>.',
    },
  ],
  css: [
    {
      id: "css-1",
      title: "Change Text Color",
      description: "Use the color property to change how text looks.",
      difficulty: "beginner",
      instruction: "Set the h1 text color to blue.",
      starterCode: "h1 {\n  /* Make the text blue */\n  \n}",
      solution: "h1 {\n  color: blue;\n}",
      validator: (code) => {
        const has = /color\s*:\s*blue/i.test(code);
        return { pass: has, message: has ? "Text is blue!" : "Add color: blue; inside the h1 rule." };
      },
      hint: "Use the color property: color: blue;",
    },
    {
      id: "css-2",
      title: "Background & Padding",
      description: "Style containers with background-color and padding.",
      difficulty: "beginner",
      instruction: "Give the .card class a light grey background (#f0f0f0) and 20px padding.",
      starterCode: ".card {\n  /* Style the card */\n  \n}",
      solution: ".card {\n  background-color: #f0f0f0;\n  padding: 20px;\n}",
      validator: (code) => {
        const hasBg = /background(-color)?\s*:\s*#f0f0f0/i.test(code);
        const hasPad = /padding\s*:\s*20px/i.test(code);
        return { pass: hasBg && hasPad, message: hasBg && hasPad ? "Card styled!" : "Need background-color: #f0f0f0 and padding: 20px." };
      },
      hint: "Use background-color and padding properties.",
    },
    {
      id: "css-3",
      title: "Flexbox Layout",
      description: "Use display: flex to create flexible layouts.",
      difficulty: "intermediate",
      instruction: "Make .container a flex container with items centered both horizontally and vertically.",
      starterCode: ".container {\n  /* Center items with flexbox */\n  \n}",
      solution: ".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}",
      validator: (code) => {
        const hasFlex = /display\s*:\s*flex/i.test(code);
        const hasJC = /justify-content\s*:\s*center/i.test(code);
        const hasAI = /align-items\s*:\s*center/i.test(code);
        return { pass: hasFlex && hasJC && hasAI, message: hasFlex && hasJC && hasAI ? "Perfectly centered!" : "Need display:flex, justify-content:center, align-items:center." };
      },
      hint: "Flexbox needs three properties: display, justify-content, align-items.",
    },
    {
      id: "css-4",
      title: "CSS Grid",
      description: "Build two-dimensional layouts with CSS Grid.",
      difficulty: "advanced",
      instruction: "Create a 3-column grid with equal columns and a 16px gap.",
      starterCode: ".grid {\n  /* Create a 3-column grid */\n  \n}",
      solution: ".grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 16px;\n}",
      validator: (code) => {
        const hasGrid = /display\s*:\s*grid/i.test(code);
        const hasCols = /grid-template-columns/i.test(code);
        const hasGap = /gap\s*:\s*16px/i.test(code);
        return { pass: hasGrid && hasCols && hasGap, message: hasGrid && hasCols && hasGap ? "Grid ready!" : "Need display:grid, grid-template-columns, and gap:16px." };
      },
      hint: "Use grid-template-columns: 1fr 1fr 1fr for 3 equal columns.",
    },
  ],
  javascript: [
    {
      id: "js-1",
      title: "Variables",
      description: "Store values using let and const.",
      difficulty: "beginner",
      instruction: "Create a variable called 'name' with your name, and a constant called 'age' with a number.",
      starterCode: "// Create your variables below\n",
      solution: 'let name = "Student";\nconst age = 16;',
      validator: (code) => {
        const hasLet = /let\s+name\s*=/i.test(code);
        const hasConst = /const\s+age\s*=\s*\d+/i.test(code);
        return { pass: hasLet && hasConst, message: hasLet && hasConst ? "Variables created!" : "Need 'let name = ...' and 'const age = number'." };
      },
      hint: "let is for changeable values, const is for fixed values.",
    },
    {
      id: "js-2",
      title: "Functions",
      description: "Functions are reusable blocks of code.",
      difficulty: "beginner",
      instruction: "Write a function called 'greet' that takes a name parameter and returns \"Hello, \" + name.",
      starterCode: "// Write your function\n",
      solution: 'function greet(name) {\n  return "Hello, " + name;\n}',
      validator: (code) => {
        const hasFn = /function\s+greet\s*\(\s*name\s*\)/i.test(code);
        const hasReturn = /return\s+["']Hello,?\s*["']\s*\+\s*name/i.test(code) || /return\s*`Hello,?\s*\$\{name\}`/i.test(code);
        return { pass: hasFn && hasReturn, message: hasFn && hasReturn ? "Function works!" : "Need function greet(name) that returns 'Hello, ' + name." };
      },
      hint: 'Use function greet(name) { return "Hello, " + name; }',
    },
    {
      id: "js-3",
      title: "Arrays & Loops",
      description: "Store multiple values and iterate over them.",
      difficulty: "intermediate",
      instruction: "Create an array called 'subjects' with 3 subjects. Use a for loop to log each one.",
      starterCode: "// Create array and loop\n",
      solution: 'const subjects = ["Math", "Physics", "Biology"];\nfor (let i = 0; i < subjects.length; i++) {\n  console.log(subjects[i]);\n}',
      validator: (code) => {
        const hasArr = /(?:const|let|var)\s+subjects\s*=\s*\[/i.test(code);
        const hasLoop = /for\s*\(/i.test(code) || /\.forEach/i.test(code) || /for\s*\(\s*(?:const|let)\s+\w+\s+of/i.test(code);
        return { pass: hasArr && hasLoop, message: hasArr && hasLoop ? "Loop works!" : "Need an array 'subjects' and a loop to iterate." };
      },
      hint: "Create with [...] and loop with for or forEach.",
    },
    {
      id: "js-4",
      title: "Objects & Methods",
      description: "Objects group related data and functionality.",
      difficulty: "intermediate",
      instruction: "Create a 'student' object with name, age, and a greet() method that returns a greeting string.",
      starterCode: "// Create a student object\n",
      solution: 'const student = {\n  name: "Ada",\n  age: 16,\n  greet() {\n    return "Hi, I am " + this.name;\n  }\n};',
      validator: (code) => {
        const hasObj = /(?:const|let|var)\s+student\s*=\s*\{/i.test(code);
        const hasName = /name\s*:/i.test(code);
        const hasGreet = /greet\s*[\(:]|greet\s*:\s*function/i.test(code);
        return { pass: hasObj && hasName && hasGreet, message: hasObj && hasName && hasGreet ? "Object built!" : "Need a student object with name and greet() method." };
      },
      hint: "Methods are functions inside objects: greet() { return ... }",
    },
    {
      id: "js-5",
      title: "Async/Await & Fetch",
      description: "Make API calls with modern async JavaScript.",
      difficulty: "advanced",
      instruction: "Write an async function 'getData' that fetches from a URL and returns the JSON response.",
      starterCode: "// Write an async fetch function\n",
      solution: 'async function getData(url) {\n  const response = await fetch(url);\n  const data = await response.json();\n  return data;\n}',
      validator: (code) => {
        const hasAsync = /async\s+function\s+getData/i.test(code);
        const hasFetch = /await\s+fetch/i.test(code);
        const hasJson = /\.json\(\)/i.test(code);
        return { pass: hasAsync && hasFetch && hasJson, message: hasAsync && hasFetch && hasJson ? "Async mastered!" : "Need async function with await fetch() and .json()." };
      },
      hint: "Use async function, await fetch(url), then await response.json().",
    },
  ],
  python: [
    {
      id: "py-1",
      title: "Print & Variables",
      description: "Output text and store values in Python.",
      difficulty: "beginner",
      instruction: "Create a variable 'name' with a string value and print it.",
      starterCode: "# Create and print a variable\n",
      solution: 'name = "Student"\nprint(name)',
      validator: (code) => {
        const hasVar = /name\s*=\s*["']/i.test(code);
        const hasPrint = /print\s*\(/i.test(code);
        return { pass: hasVar && hasPrint, message: hasVar && hasPrint ? "Printed!" : "Need name = 'value' and print(name)." };
      },
      hint: "Python doesn't need let/const — just name = 'value'.",
    },
    {
      id: "py-2",
      title: "If/Else Conditions",
      description: "Make decisions in your code with conditionals.",
      difficulty: "beginner",
      instruction: "Write an if/else that prints \"Pass\" if score >= 50, otherwise prints \"Fail\". Set score = 65.",
      starterCode: "# Check if a student passed\nscore = 65\n",
      solution: 'score = 65\nif score >= 50:\n    print("Pass")\nelse:\n    print("Fail")',
      validator: (code) => {
        const hasIf = /if\s+score\s*>=\s*50\s*:/i.test(code) || /if\s+score\s*>=\s*50/i.test(code);
        const hasElse = /else\s*:/i.test(code);
        return { pass: hasIf && hasElse, message: hasIf && hasElse ? "Condition works!" : "Need if score >= 50: and else: blocks." };
      },
      hint: "Python uses colons and indentation: if score >= 50:",
    },
    {
      id: "py-3",
      title: "Lists & For Loops",
      description: "Iterate over collections of data.",
      difficulty: "intermediate",
      instruction: "Create a list of 3 subjects and use a for loop to print each one.",
      starterCode: "# Create a list and loop through it\n",
      solution: 'subjects = ["Math", "Physics", "Biology"]\nfor subject in subjects:\n    print(subject)',
      validator: (code) => {
        const hasList = /subjects\s*=\s*\[/i.test(code);
        const hasFor = /for\s+\w+\s+in\s+subjects\s*:/i.test(code);
        return { pass: hasList && hasFor, message: hasList && hasFor ? "Looping!" : "Need subjects = [...] and for item in subjects:" };
      },
      hint: "Python for loops: for item in list:",
    },
    {
      id: "py-4",
      title: "Functions & Return",
      description: "Define reusable functions with def.",
      difficulty: "intermediate",
      instruction: "Write a function 'calculate_grade' that takes a score and returns 'A' if >= 70, 'B' if >= 60, 'C' if >= 50, else 'F'.",
      starterCode: "# Define the grading function\n",
      solution: 'def calculate_grade(score):\n    if score >= 70:\n        return "A"\n    elif score >= 60:\n        return "B"\n    elif score >= 50:\n        return "C"\n    else:\n        return "F"',
      validator: (code) => {
        const hasDef = /def\s+calculate_grade\s*\(\s*score\s*\)\s*:/i.test(code);
        const hasReturn = /return\s+["']A["']/i.test(code);
        const hasElif = /elif/i.test(code);
        return { pass: hasDef && hasReturn && hasElif, message: hasDef && hasReturn && hasElif ? "Function defined!" : "Need def calculate_grade(score): with if/elif/else returning grades." };
      },
      hint: "Use def function_name(param): with if/elif/else.",
    },
    {
      id: "py-5",
      title: "Dictionaries & Classes",
      description: "Structure data with dictionaries and OOP.",
      difficulty: "advanced",
      instruction: "Create a Student class with name, age attributes and a greet() method that returns a greeting.",
      starterCode: "# Create a Student class\n",
      solution: 'class Student:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def greet(self):\n        return f"Hi, I am {self.name}"',
      validator: (code) => {
        const hasClass = /class\s+Student\s*:/i.test(code);
        const hasInit = /def\s+__init__\s*\(\s*self/i.test(code);
        const hasGreet = /def\s+greet\s*\(\s*self\s*\)\s*:/i.test(code);
        return { pass: hasClass && hasInit && hasGreet, message: hasClass && hasInit && hasGreet ? "Class created!" : "Need class Student: with __init__ and greet methods." };
      },
      hint: "Python classes use self: class Student: def __init__(self, ...):",
    },
  ],
};

// ── Component ────────────────────────────────────────────────────

export function CodeLabClient() {
  const [lang, setLang] = useState<Language>("html");
  const [lessonIdx, setLessonIdx] = useState(0);
  const [code, setCode] = useState(CURRICULUM["html"][0].starterCode);
  const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const lessons = CURRICULUM[lang];
  const lesson = lessons[lessonIdx];
  const progress = lessons.filter((l) => completed.has(l.id)).length;

  const selectLesson = useCallback((langId: Language, idx: number) => {
    setLang(langId);
    setLessonIdx(idx);
    setCode(CURRICULUM[langId][idx].starterCode);
    setResult(null);
    setShowHint(false);
    setShowSolution(false);
  }, []);

  const runCode = useCallback(() => {
    const res = lesson.validator(code);
    setResult(res);
    if (res.pass) {
      setCompleted((s) => new Set([...s, lesson.id]));
    }
  }, [code, lesson]);

  const nextLesson = useCallback(() => {
    if (lessonIdx < lessons.length - 1) {
      selectLesson(lang, lessonIdx + 1);
    }
  }, [lessonIdx, lessons.length, lang, selectLesson]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar — Language & Lesson picker */}
      <div className="lg:col-span-1 space-y-4">
        {/* Language tabs */}
        <div className="bg-surface border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider px-1">Language</p>
          {LANGUAGES.map(({ id, label, icon, color, bg }) => (
            <button
              key={id}
              onClick={() => selectLesson(id, 0)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left"
              style={{
                background: lang === id ? bg : "transparent",
                color: lang === id ? color : "var(--color-text-2)",
                border: lang === id ? `1px solid ${color}40` : "1px solid transparent",
              }}
            >
              {icon}
              {label}
              <span className="ml-auto text-xs opacity-60">
                {CURRICULUM[id].filter((l) => completed.has(l.id)).length}/{CURRICULUM[id].length}
              </span>
            </button>
          ))}
        </div>

        {/* Lesson list */}
        <div className="bg-surface border border-border rounded-xl p-3 space-y-1">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider px-1 mb-2">Lessons</p>
          {lessons.map((l, i) => {
            const done = completed.has(l.id);
            const active = i === lessonIdx;
            const locked = i > 0 && !completed.has(lessons[i - 1].id) && !done;
            const diffStyle = DIFF_LABELS[l.difficulty];
            return (
              <button
                key={l.id}
                onClick={() => !locked && selectLesson(lang, i)}
                disabled={locked}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                style={{
                  background: active ? "var(--color-primary-bg, rgba(59,130,246,0.08))" : "transparent",
                  color: locked ? "var(--color-muted)" : "var(--color-text)",
                  border: active ? "1px solid var(--color-primary-border, rgba(59,130,246,0.3))" : "1px solid transparent",
                  opacity: locked ? 0.5 : 1,
                }}
              >
                {done ? (
                  <CheckCircle size={14} className="text-success shrink-0" />
                ) : locked ? (
                  <Lock size={14} className="shrink-0" style={{ color: "var(--color-muted)" }} />
                ) : (
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                    style={{ borderColor: diffStyle.color }}
                  />
                )}
                <span className="truncate flex-1">{l.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: diffStyle.color, background: `${diffStyle.color}18` }}>
                  {diffStyle.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-text-2">Progress</span>
            <span className="font-bold text-primary">{progress}/{lessons.length}</span>
          </div>
          <div className="h-2 rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(progress / lessons.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main — Code editor & output */}
      <div className="lg:col-span-3 space-y-4">
        {/* Lesson info */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Code2 size={16} className="text-primary" />
            <h2 className="font-bold text-text">{lesson.title}</h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
              style={{ color: DIFF_LABELS[lesson.difficulty].color, background: `${DIFF_LABELS[lesson.difficulty].color}18` }}
            >
              {DIFF_LABELS[lesson.difficulty].label}
            </span>
          </div>
          <p className="text-sm text-text-2 mb-3">{lesson.description}</p>
          <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-text font-medium">{lesson.instruction}</p>
          </div>
        </div>

        {/* Code editor */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-muted ml-2">
                {lesson.id}.{lang === "python" ? "py" : lang === "javascript" ? "js" : lang}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-xs px-2.5 py-1 rounded-md text-text-2 border border-border hover:border-primary/40 transition-colors"
              >
                {showHint ? "Hide Hint" : "Hint"}
              </button>
              <button
                onClick={() => { setShowSolution(!showSolution); setCode(showSolution ? lesson.starterCode : lesson.solution); }}
                className="text-xs px-2.5 py-1 rounded-md text-text-2 border border-border hover:border-primary/40 transition-colors"
              >
                {showSolution ? "Reset" : "Solution"}
              </button>
            </div>
          </div>

          {/* Hint */}
          {showHint && (
            <div className="px-4 py-2 border-b border-border bg-amber-500/5">
              <p className="text-xs text-amber-600">💡 {lesson.hint}</p>
            </div>
          )}

          {/* Editor area */}
          <div className="relative">
            <textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); setResult(null); }}
              spellCheck={false}
              className="w-full min-h-[200px] pl-10 pr-4 py-3 font-mono text-sm bg-[#1e1e2e] text-[#d4d4d4] resize-y outline-none leading-relaxed"
              style={{ tabSize: 2 }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const ta = e.currentTarget;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  setCode(code.substring(0, start) + "  " + code.substring(end));
                  requestAnimationFrame(() => {
                    ta.selectionStart = ta.selectionEnd = start + 2;
                  });
                }
              }}
            />
            {/* Line numbers overlay */}
            <div className="absolute left-0 top-0 w-8 h-full bg-[#1e1e2e] border-r border-[#333] flex flex-col items-end pr-1.5 pt-3 pointer-events-none">
              {code.split("\n").map((_, i) => (
                <div key={i} className="text-[10px] leading-relaxed text-[#555] font-mono">{i + 1}</div>
              ))}
            </div>
          </div>

          {/* Run button */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-bg">
            <button
              onClick={runCode}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              <Play size={14} />
              Run Code
            </button>

            {result && (
              <div className={`flex items-center gap-2 text-sm font-medium ${result.pass ? "text-success" : "text-danger"}`}>
                {result.pass ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {result.message}
              </div>
            )}

            {result?.pass && lessonIdx < lessons.length - 1 && (
              <button
                onClick={nextLesson}
                className="ml-auto flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold text-primary border border-primary/30 hover:bg-primary/5 transition-colors"
              >
                Next Lesson <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Preview (HTML/CSS only) */}
        {(lang === "html" || lang === "css") && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-bg">
              <span className="text-xs font-bold text-text-2">Live Preview</span>
            </div>
            <div className="p-4 bg-white min-h-[100px]">
              {lang === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: code.replace(/<script[\s\S]*?<\/script>/gi, "") }} />
              ) : (
                <div>
                  <style dangerouslySetInnerHTML={{ __html: code }} />
                  <div className="container">
                    <div className="grid">
                      <div className="card" style={{ border: "1px solid #ddd", padding: "8px" }}>
                        <h1>Sample Heading</h1>
                        <p>This is a preview paragraph.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
