"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Code2, Play, CheckCircle, XCircle, ChevronRight,
  Globe, Palette, Zap, Terminal, Lock,
  Sparkles, Send, X, Loader2, Settings, Copy, Maximize2, Minimize2,
} from "lucide-react";

type Language = "html" | "css" | "javascript" | "python";
type Difficulty = "beginner" | "intermediate" | "advanced";
type EditorTheme = "vs-dark" | "monokai" | "light";

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

const THEMES: Record<EditorTheme, { bg: string; text: string; lineNum: string; border: string; label: string }> = {
  "vs-dark":  { bg: "#1e1e2e", text: "#d4d4d4", lineNum: "#555", border: "#333", label: "VS Dark" },
  "monokai":  { bg: "#272822", text: "#f8f8f2", lineNum: "#75715e", border: "#3e3d32", label: "Monokai" },
  "light":    { bg: "#f8f8f8", text: "#383a42", lineNum: "#aaa", border: "#ddd", label: "Light" },
};

// Autosuggestion keyword lists per language
const SUGGESTIONS: Record<Language, string[]> = {
  html: [
    "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img", "ul", "ol", "li", "table", "tr", "th", "td",
    "input", "button", "form", "select", "option", "textarea",
    "section", "header", "footer", "nav", "main", "article", "aside",
    "figure", "figcaption", "audio", "video", "source", "iframe",
    "label", "fieldset", "legend", "script", "style", "link", "meta",
    "href", "src", "alt", "class", "id", "type", "name", "value",
    "placeholder", "required", "disabled", "checked", "selected",
    "target", "rel", "charset", "content", "width", "height",
  ],
  css: [
    "color", "background", "background-color", "background-image",
    "display", "flex", "grid", "block", "inline", "none",
    "flex-direction", "justify-content", "align-items", "flex-wrap",
    "gap", "grid-template-columns", "grid-template-rows", "grid-area",
    "margin", "margin-top", "margin-bottom", "margin-left", "margin-right",
    "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
    "border", "border-radius", "border-color", "border-width", "border-style",
    "width", "height", "max-width", "min-width", "max-height", "min-height",
    "font-size", "font-weight", "font-family", "font-style",
    "text-align", "text-decoration", "text-transform", "line-height",
    "position", "top", "left", "right", "bottom", "z-index",
    "overflow", "opacity", "visibility", "cursor", "pointer",
    "transition", "animation", "transform", "rotate", "scale", "translate",
    "box-shadow", "text-shadow", "filter", "var", "calc",
  ],
  javascript: [
    "function", "const", "let", "var", "return", "class", "new",
    "if", "else", "else if", "for", "while", "do", "switch", "case",
    "import", "export", "default", "from", "async", "await", "try", "catch", "finally",
    "true", "false", "null", "undefined", "typeof", "instanceof",
    "console.log", "console.error", "console.warn",
    "document.getElementById", "document.querySelector", "document.createElement",
    "addEventListener", "preventDefault", "stopPropagation",
    "Array", "Object", "String", "Number", "Boolean", "Promise",
    "map", "filter", "reduce", "forEach", "find", "findIndex",
    "push", "pop", "shift", "unshift", "splice", "slice", "join",
    "fetch", "then", "catch", "JSON.parse", "JSON.stringify",
    "Math.floor", "Math.ceil", "Math.round", "Math.random", "Math.max", "Math.min",
  ],
  python: [
    "def", "class", "import", "from", "return", "yield",
    "if", "elif", "else", "for", "while", "try", "except", "finally", "with",
    "True", "False", "None", "and", "or", "not", "in", "is",
    "print", "input", "len", "range", "type", "isinstance", "int", "str", "float", "bool",
    "list", "dict", "tuple", "set", "append", "extend", "remove", "pop",
    "open", "read", "write", "close", "enumerate", "zip", "sorted", "reversed",
    "lambda", "map", "filter", "reduce", "sum", "min", "max",
    "self", "__init__", "__str__", "__repr__", "super",
    "os", "sys", "math", "random", "json", "re",
  ],
};

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

// --- Full curriculum (unchanged from original) ---
const CURRICULUM: Record<Language, Lesson[]> = {
  html: [
    { id:"html-1", title:"Headings (h1–h6)", description:"HTML has six heading levels. <h1> is the most important; <h6> is the least.", difficulty:"beginner", instruction:'Create an <h1> saying "Welcome to Nigeria" and an <h2> saying "Our Beautiful Country".', starterCode:"<!-- Create two headings below -->\n", solution:"<h1>Welcome to Nigeria</h1>\n<h2>Our Beautiful Country</h2>", validator:(c)=>{ const h1=/<h1[^>]*>.*Welcome to Nigeria.*<\/h1>/i.test(c),h2=/<h2[^>]*>.*Our Beautiful Country.*<\/h2>/i.test(c); return{pass:h1&&h2,message:h1&&h2?"Both headings created!":"Need <h1>Welcome to Nigeria</h1> and <h2>Our Beautiful Country</h2>."}; }, hint:"Use <h1> for the main title and <h2> for the sub-heading." },
    { id:"html-2", title:"Paragraphs", description:"The <p> tag creates a block of paragraph text.", difficulty:"beginner", instruction:'Create a paragraph that says "I am learning HTML".', starterCode:"<h1>My Page</h1>\n<!-- Add a paragraph below -->\n", solution:"<h1>My Page</h1>\n<p>I am learning HTML</p>", validator:(c)=>{ const has=/<p[^>]*>.*I am learning HTML.*<\/p>/i.test(c); return{pass:has,message:has?"Paragraph created!":"Use the <p> tag for paragraphs."}; }, hint:"Use <p>Your text here</p>." },
    { id:"html-3", title:"Links", description:"The <a> tag creates clickable links using the href attribute.", difficulty:"beginner", instruction:'Create a link that says "Visit Google" and points to https://google.com.', starterCode:"<!-- Create a link below -->\n", solution:'<a href="https://google.com">Visit Google</a>', validator:(c)=>{ const has=/<a\s+href=["']https?:\/\/google\.com["'][^>]*>.*Visit Google.*<\/a>/i.test(c); return{pass:has,message:has?"Link works!":'Use <a href="https://google.com">Visit Google</a>.'}; }, hint:'Links need an href attribute: <a href="url">text</a>.' },
    { id:"html-4", title:"Images", description:"The <img> tag embeds images. It uses src for the file path and alt for accessibility.", difficulty:"beginner", instruction:'Add an image with src="flag.jpg" and alt="Nigerian flag".', starterCode:"<!-- Add an image below -->\n", solution:'<img src="flag.jpg" alt="Nigerian flag" />', validator:(c)=>{ const hasSrc=/src=["']flag\.jpg["']/i.test(c),hasAlt=/alt=["']Nigerian flag["']/i.test(c); return{pass:hasSrc&&hasAlt,message:hasSrc&&hasAlt?"Image added!":'Need src="flag.jpg" and alt="Nigerian flag".'}; }, hint:'Use <img src="path" alt="description" />.' },
    { id:"html-5", title:"Unordered Lists", description:"The <ul> tag creates a bullet list. Each item uses <li>.", difficulty:"beginner", instruction:"Create an unordered list with three subjects: Mathematics, Physics, Chemistry.", starterCode:"<!-- Create a bullet list -->\n", solution:"<ul>\n  <li>Mathematics</li>\n  <li>Physics</li>\n  <li>Chemistry</li>\n</ul>", validator:(c)=>{ const hasUl=/<ul/i.test(c),items=(c.match(/<li/gi)||[]).length,pass=hasUl&&items>=3; return{pass,message:pass?"Great list!":`Need a <ul> with 3 <li> items. Found ${items}.`}; }, hint:"Wrap <li> items inside a <ul> tag." },
    { id:"html-6", title:"Ordered Lists", description:"The <ol> tag creates a numbered list. Items are still <li> tags.", difficulty:"beginner", instruction:"Create a numbered list with three steps: Wake up, Brush teeth, Eat breakfast.", starterCode:"<!-- Create a numbered list -->\n", solution:"<ol>\n  <li>Wake up</li>\n  <li>Brush teeth</li>\n  <li>Eat breakfast</li>\n</ol>", validator:(c)=>{ const hasOl=/<ol/i.test(c),items=(c.match(/<li/gi)||[]).length,pass=hasOl&&items>=3; return{pass,message:pass?"Numbered list created!":`Need an <ol> with 3 <li> items. Found ${items}.`}; }, hint:"Use <ol> for numbered lists — same <li> items inside." },
    { id:"html-7", title:"Tables", description:"Tables organise data in rows and columns using <table>, <tr>, <th>, and <td>.", difficulty:"intermediate", instruction:"Create a table with a header row (Name, Score) and one data row (Amaka, 85).", starterCode:"<!-- Create a table -->\n", solution:"<table>\n  <tr>\n    <th>Name</th>\n    <th>Score</th>\n  </tr>\n  <tr>\n    <td>Amaka</td>\n    <td>85</td>\n  </tr>\n</table>", validator:(c)=>{ const hasTable=/<table/i.test(c),hasTh=/<th/i.test(c),hasTd=/<td/i.test(c),pass=hasTable&&hasTh&&hasTd; return{pass,message:pass?"Table built!":"Need <table> with <th> header cells and <td> data cells."}; }, hint:"Use <tr> for rows, <th> for headers, <td> for data cells." },
    { id:"html-8", title:"Forms & Text Inputs", description:"Forms collect user input. Use <form>, <input>, and <button>.", difficulty:"intermediate", instruction:'Create a form with a text input (name="username", placeholder="Enter name") and a submit button.', starterCode:"<!-- Build a form -->\n", solution:'<form>\n  <input type="text" name="username" placeholder="Enter name" />\n  <button type="submit">Submit</button>\n</form>', validator:(c)=>{ const hasForm=/<form/i.test(c),hasInput=/name=["']username["']/i.test(c),hasBtn=/<button/i.test(c),pass=hasForm&&hasInput&&hasBtn; return{pass,message:pass?"Form built!":'Need a <form> with an input (name="username") and a button.'}; }, hint:'Use <input type="text" name="username" /> inside a <form>.' },
    { id:"html-9", title:"Semantic HTML", description:'Semantic tags like <header>, <nav>, <main>, <section>, and <footer> give meaning to your layout.', difficulty:"intermediate", instruction:"Create a page structure with a <header>, a <main>, and a <footer>. Put any content inside each.", starterCode:"<!-- Use semantic HTML -->\n", solution:"<header>My School</header>\n<main>\n  <p>Welcome to our school website.</p>\n</main>\n<footer>&copy; 2024</footer>", validator:(c)=>{ const hasHeader=/<header/i.test(c),hasMain=/<main/i.test(c),hasFooter=/<footer/i.test(c),pass=hasHeader&&hasMain&&hasFooter; return{pass,message:pass?"Semantic structure built!":"Need <header>, <main>, and <footer> elements."}; }, hint:"Semantic tags describe purpose: <header>, <main>, <footer>." },
  ],
  css: [
    { id:"css-1", title:"Text Color", description:"The color property sets the text colour of an element.", difficulty:"beginner", instruction:"Set the h1 text color to blue.", starterCode:"h1 {\n  /* Make the text blue */\n  \n}", solution:"h1 {\n  color: blue;\n}", validator:(c)=>{ const has=/color\s*:\s*blue/i.test(c); return{pass:has,message:has?"Text is blue!":"Add color: blue; inside the h1 rule."}; }, hint:"Use the color property: color: blue;" },
    { id:"css-2", title:"Background & Padding", description:"background-color sets the fill colour; padding adds space inside the element border.", difficulty:"beginner", instruction:"Give .card a light grey background (#f0f0f0) and 20px padding.", starterCode:".card {\n  /* Style the card */\n  \n}", solution:".card {\n  background-color: #f0f0f0;\n  padding: 20px;\n}", validator:(c)=>{ const hasBg=/background(-color)?\s*:\s*#f0f0f0/i.test(c),hasPad=/padding\s*:\s*20px/i.test(c); return{pass:hasBg&&hasPad,message:hasBg&&hasPad?"Card styled!":"Need background-color: #f0f0f0 and padding: 20px."}; }, hint:"Use background-color and padding properties." },
    { id:"css-3", title:"Font & Text Styling", description:"CSS controls font-size, font-weight, font-family, and text-align.", difficulty:"beginner", instruction:"Style the p tag: font-size 18px, font-weight bold, and text-align center.", starterCode:"p {\n  /* Style the paragraph text */\n  \n}", solution:"p {\n  font-size: 18px;\n  font-weight: bold;\n  text-align: center;\n}", validator:(c)=>{ const hasSize=/font-size\s*:\s*18px/i.test(c),hasWeight=/font-weight\s*:\s*bold/i.test(c),hasAlign=/text-align\s*:\s*center/i.test(c),pass=hasSize&&hasWeight&&hasAlign; return{pass,message:pass?"Text styled!":"Need font-size: 18px, font-weight: bold, and text-align: center."}; }, hint:"Three separate properties: font-size, font-weight, text-align." },
    { id:"css-4", title:"Box Model", description:"Every element has margin (outside), border, padding (inside), and content.", difficulty:"beginner", instruction:"Give .card a 2px solid black border and a 16px margin.", starterCode:".card {\n  background-color: #f0f0f0;\n  padding: 16px;\n  /* Add border and margin */\n  \n}", solution:".card {\n  background-color: #f0f0f0;\n  padding: 16px;\n  border: 2px solid black;\n  margin: 16px;\n}", validator:(c)=>{ const hasBorder=/border\s*:\s*2px\s+solid\s+black/i.test(c),hasMargin=/margin\s*:\s*16px/i.test(c),pass=hasBorder&&hasMargin; return{pass,message:pass?"Box model applied!":"Need border: 2px solid black and margin: 16px."}; }, hint:"Use border: 2px solid black; and margin: 16px;" },
    { id:"css-5", title:"Flexbox Basics", description:"display: flex creates a flexible row. justify-content aligns horizontally; align-items aligns vertically.", difficulty:"intermediate", instruction:"Make .container a flex container with items centred both horizontally and vertically.", starterCode:".container {\n  height: 200px;\n  background: #eee;\n  /* Center items with flexbox */\n}", solution:".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 200px;\n  background: #eee;\n}", validator:(c)=>{ const hasFlex=/display\s*:\s*flex/i.test(c),hasJC=/justify-content\s*:\s*center/i.test(c),hasAI=/align-items\s*:\s*center/i.test(c); return{pass:hasFlex&&hasJC&&hasAI,message:hasFlex&&hasJC&&hasAI?"Perfectly centred!":"Need display: flex, justify-content: center, align-items: center."}; }, hint:"Flexbox needs: display: flex, justify-content: center, align-items: center." },
    { id:"css-6", title:"CSS Grid Basics", description:"display: grid creates a two-dimensional layout.", difficulty:"advanced", instruction:"Create a 3-column equal grid with a 16px gap.", starterCode:".grid {\n  /* Create a 3-column grid */\n  \n}", solution:".grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 16px;\n}", validator:(c)=>{ const hasGrid=/display\s*:\s*grid/i.test(c),hasCols=/grid-template-columns/i.test(c),hasGap=/gap\s*:\s*16px/i.test(c); return{pass:hasGrid&&hasCols&&hasGap,message:hasGrid&&hasCols&&hasGap?"Grid ready!":"Need display: grid, grid-template-columns: 1fr 1fr 1fr, and gap: 16px."}; }, hint:"Use grid-template-columns: 1fr 1fr 1fr for 3 equal columns." },
    { id:"css-7", title:"Transitions", description:"CSS transitions animate property changes smoothly over a given duration.", difficulty:"advanced", instruction:"Add a transition to a button so background-color changes smoothly over 0.3s ease on hover.", starterCode:"button {\n  background-color: #3b82f6;\n  color: white;\n  padding: 10px 20px;\n  border: none;\n  cursor: pointer;\n  /* Add transition */\n}\nbutton:hover {\n  background-color: #1d4ed8;\n}", solution:"button {\n  background-color: #3b82f6;\n  color: white;\n  padding: 10px 20px;\n  border: none;\n  cursor: pointer;\n  transition: background-color 0.3s ease;\n}\nbutton:hover {\n  background-color: #1d4ed8;\n}", validator:(c)=>{ const hasT=/transition\s*:/i.test(c),hasD=/0\.3s/i.test(c),pass=hasT&&hasD; return{pass,message:pass?"Transition added!":"Need transition: background-color 0.3s ease inside the button rule (not :hover)."}; }, hint:"Add transition: background-color 0.3s ease; to the button base rule (not :hover)." },
  ],
  javascript: [
    { id:"js-1", title:"Variables", description:"Store values using let and const.", difficulty:"beginner", instruction:"Create a variable called 'name' with your name, and a constant called 'age' with a number.", starterCode:"// Create your variables below\n", solution:'let name = "Student";\nconst age = 16;', validator:(c)=>{ const hasLet=/let\s+name\s*=/i.test(c),hasConst=/const\s+age\s*=\s*\d+/i.test(c); return{pass:hasLet&&hasConst,message:hasLet&&hasConst?"Variables created!":"Need 'let name = ...' and 'const age = number'."}; }, hint:"let is for changeable values, const is for fixed values." },
    { id:"js-2", title:"Functions", description:"Functions are reusable blocks of code.", difficulty:"beginner", instruction:'Write a function called "greet" that takes a name parameter and returns "Hello, " + name.', starterCode:"// Write your function\n", solution:'function greet(name) {\n  return "Hello, " + name;\n}', validator:(c)=>{ const hasFn=/function\s+greet\s*\(\s*name\s*\)/i.test(c),hasReturn=/return\s+["']Hello,?\s*["']\s*\+\s*name/i.test(c)||/return\s*`Hello,?\s*\$\{name\}`/i.test(c); return{pass:hasFn&&hasReturn,message:hasFn&&hasReturn?"Function works!":"Need function greet(name) that returns 'Hello, ' + name."}; }, hint:'Use function greet(name) { return "Hello, " + name; }' },
    { id:"js-3", title:"Arrays & Loops", description:"Store multiple values and iterate over them.", difficulty:"intermediate", instruction:"Create an array called 'subjects' with 3 subjects. Use a for loop to log each one.", starterCode:"// Create array and loop\n", solution:'const subjects = ["Math", "Physics", "Biology"];\nfor (let i = 0; i < subjects.length; i++) {\n  console.log(subjects[i]);\n}', validator:(c)=>{ const hasArr=/(?:const|let|var)\s+subjects\s*=\s*\[/i.test(c),hasLoop=/for\s*\(/i.test(c)||/\.forEach/i.test(c)||/for\s*\(\s*(?:const|let)\s+\w+\s+of/i.test(c); return{pass:hasArr&&hasLoop,message:hasArr&&hasLoop?"Loop works!":"Need an array 'subjects' and a loop to iterate."}; }, hint:"Create with [...] and loop with for or forEach." },
    { id:"js-4", title:"Async/Await & Fetch", description:"Make API calls with modern async JavaScript.", difficulty:"advanced", instruction:"Write an async function 'getData' that fetches from a URL and returns the JSON response.", starterCode:"// Write an async fetch function\n", solution:'async function getData(url) {\n  const response = await fetch(url);\n  const data = await response.json();\n  return data;\n}', validator:(c)=>{ const hasAsync=/async\s+function\s+getData/i.test(c),hasFetch=/await\s+fetch/i.test(c),hasJson=/\.json\(\)/i.test(c); return{pass:hasAsync&&hasFetch&&hasJson,message:hasAsync&&hasFetch&&hasJson?"Async mastered!":"Need async function with await fetch() and .json()."}; }, hint:"Use async function, await fetch(url), then await response.json()." },
  ],
  python: [
    { id:"py-1", title:"Print & Variables", description:"Store values in variables and display them with print().", difficulty:"beginner", instruction:'Create name = "Nigeria" and capital = "Abuja". Print both on separate lines.', starterCode:"# Create and print variables\n", solution:'name = "Nigeria"\ncapital = "Abuja"\nprint(name)\nprint(capital)', validator:(c)=>{ const hasName=/name\s*=\s*["']/i.test(c),hasPrint=(c.match(/print\s*\(/gi)||[]).length>=2; return{pass:hasName&&hasPrint,message:hasName&&hasPrint?"Variables printed!":"Need name = '...' and capital = '...' with two print() calls."}; }, hint:"Python uses = to assign: name = 'Nigeria'. Use print(name) to output." },
    { id:"py-2", title:"If / Elif / Else", description:"Conditionals make decisions. Python uses if, elif, and else.", difficulty:"beginner", instruction:'Set score = 65. Print "A" if >= 70, "B" if >= 60, "C" if >= 50, else "F".', starterCode:"score = 65\n# Write your if/elif/else\n", solution:'score = 65\nif score >= 70:\n    print("A")\nelif score >= 60:\n    print("B")\nelif score >= 50:\n    print("C")\nelse:\n    print("F")', validator:(c)=>{ const hasIf=/if\s+score\s*>=\s*70\s*:/i.test(c),hasElif=/elif/i.test(c),hasElse=/else\s*:/i.test(c),pass=hasIf&&hasElif&&hasElse; return{pass,message:pass?"Grading logic works!":"Need if score >= 70:, elif blocks, and else: block."}; }, hint:"Python uses elif (not else if). Each condition ends with a colon: if score >= 70:" },
    { id:"py-3", title:"Functions & Return", description:"Define reusable blocks with def. Use return to send a value back.", difficulty:"intermediate", instruction:"Write calculate_grade(score) that returns 'A' if >= 70, 'B' if >= 60, 'C' if >= 50, else 'F'.", starterCode:"# Define the grading function\n", solution:'def calculate_grade(score):\n    if score >= 70:\n        return "A"\n    elif score >= 60:\n        return "B"\n    elif score >= 50:\n        return "C"\n    else:\n        return "F"', validator:(c)=>{ const hasDef=/def\s+calculate_grade\s*\(\s*score\s*\)\s*:/i.test(c),hasReturn=/return\s+["']A["']/i.test(c),hasElif=/elif/i.test(c); return{pass:hasDef&&hasReturn&&hasElif,message:hasDef&&hasReturn&&hasElif?"Function defined!":"Need def calculate_grade(score): with if/elif/else returning grades."}; }, hint:"Use def function_name(param): with if/elif/else and return." },
    { id:"py-4", title:"Classes & OOP", description:"Classes are blueprints for objects. __init__ is the constructor; self refers to the instance.", difficulty:"advanced", instruction:'Create a Student class with __init__(self, name, age) and a greet() method returning f"Hi, I am {self.name}".', starterCode:"# Create a Student class\n", solution:'class Student:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def greet(self):\n        return f"Hi, I am {self.name}"', validator:(c)=>{ const hasClass=/class\s+Student\s*:/i.test(c),hasInit=/def\s+__init__\s*\(\s*self/i.test(c),hasGreet=/def\s+greet\s*\(\s*self\s*\)\s*:/i.test(c); return{pass:hasClass&&hasInit&&hasGreet,message:hasClass&&hasInit&&hasGreet?"Class created!":"Need class Student: with __init__ and greet methods."}; }, hint:"Python classes use self: class Student: def __init__(self, name, age):" },
  ],
};

// Build preview HTML for iframe
function buildPreview(lang: Language, code: string): string {
  if (lang === "html") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:12px;font-family:system-ui,sans-serif;font-size:14px;color:#111}</style></head><body>${code.replace(/<script[\s\S]*?<\/script>/gi, "")}</body></html>`;
  }
  if (lang === "css") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:12px;font-family:system-ui,sans-serif;font-size:14px}
${code}
</style></head><body>
<div class="container"><div class="grid"><div class="card">
  <h1>Sample Heading</h1>
  <p>This is a <span class="highlight">preview</span> paragraph.</p>
  <button>Click me</button>
  <ul><li>Item one</li><li>Item two</li></ul>
</div></div></div>
</body></html>`;
  }
  return "";
}

export function CodeLabClient() {
  const [lang, setLang] = useState<Language>("html");
  const [lessonIdx, setLessonIdx] = useState(0);
  const [code, setCode] = useState(CURRICULUM["html"][0].starterCode);
  const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // Editor settings
  const [theme, setTheme] = useState<EditorTheme>("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [showSettings, setShowSettings] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);

  // Autosuggestion state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggIdx, setSuggIdx] = useState(0);
  const [suggPos, setSuggPos] = useState({ top: 0, left: 0 });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  // AI assistant state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  const lessons = CURRICULUM[lang];
  const lesson = lessons[lessonIdx];
  const progress = lessons.filter((l) => completed.has(l.id)).length;
  const themeStyle = THEMES[theme];

  const selectLesson = useCallback((langId: Language, idx: number) => {
    setLang(langId);
    setLessonIdx(idx);
    setCode(CURRICULUM[langId][idx].starterCode);
    setResult(null);
    setShowHint(false);
    setShowSolution(false);
    setSuggestions([]);
  }, []);

  const runCode = useCallback(() => {
    const res = lesson.validator(code);
    setResult(res);
    if (res.pass) setCompleted((s) => new Set([...s, lesson.id]));
  }, [code, lesson]);

  const nextLesson = useCallback(() => {
    if (lessonIdx < lessons.length - 1) selectLesson(lang, lessonIdx + 1);
  }, [lessonIdx, lessons.length, lang, selectLesson]);

  // Autosuggestion: get current word before cursor
  const getCurrentWord = useCallback((ta: HTMLTextAreaElement) => {
    const pos = ta.selectionStart;
    const text = ta.value.slice(0, pos);
    const match = text.match(/[\w-]+$/);
    return match ? match[0] : "";
  }, []);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    setResult(null);

    // Sync line number scroll
    if (lineNumRef.current && taRef.current) {
      lineNumRef.current.scrollTop = taRef.current.scrollTop;
    }

    const ta = e.target;
    const word = getCurrentWord(ta);
    if (word.length >= 2) {
      const all = SUGGESTIONS[lang];
      const matches = all.filter((s) => s.toLowerCase().startsWith(word.toLowerCase()) && s !== word).slice(0, 8);
      setSuggestions(matches);
      setSuggIdx(0);

      // Position popup near cursor using a rough estimate
      const lines = val.slice(0, ta.selectionStart).split("\n");
      const lineNum = lines.length;
      const lineH = fontSize * 1.6;
      setSuggPos({ top: lineNum * lineH + 2, left: (lines[lines.length - 1].length * (fontSize * 0.6)) + 40 });
    } else {
      setSuggestions([]);
    }
  }, [lang, fontSize, getCurrentWord]);

  const insertSuggestion = useCallback((suggestion: string) => {
    if (!taRef.current) return;
    const ta = taRef.current;
    const pos = ta.selectionStart;
    const text = ta.value;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const match = before.match(/[\w-]+$/);
    const wordLen = match ? match[0].length : 0;
    const newCode = before.slice(0, before.length - wordLen) + suggestion + after;
    setCode(newCode);
    setSuggestions([]);
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = pos - wordLen + suggestion.length;
      ta.setSelectionRange(newPos, newPos);
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggIdx((i) => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSuggIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertSuggestion(suggestions[suggIdx]); return; }
      if (e.key === "Escape") { setSuggestions([]); return; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setCode(code.substring(0, start) + "  " + code.substring(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  }, [suggestions, suggIdx, insertSuggestion, code]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  const askAI = useCallback(async (question: string) => {
    if (aiLoading) { aiAbortRef.current?.abort(); setAiLoading(false); return; }
    if (!question.trim()) return;
    setAiLoading(true); setAiResponse(""); setAiError(null);
    aiAbortRef.current = new AbortController();
    try {
      const res = await fetch("/api/coding-lab/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang, question, lessonTitle: lesson.title, lessonInstruction: lesson.instruction }),
        signal: aiAbortRef.current.signal,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "AI assistant unavailable" })); setAiError(err.error ?? "AI assistant unavailable"); return; }
      const reader = res.body?.getReader();
      if (!reader) { setAiError("No response from AI"); return; }
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiResponse((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setAiError((e as Error).message ?? "AI assistant failed");
    } finally { setAiLoading(false); }
  }, [aiLoading, code, lang, lesson]);

  const showPreview = (lang === "html" || lang === "css") && !aiOpen;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-surface border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider px-1">Language</p>
          {LANGUAGES.map(({ id, label, icon, color, bg }) => (
            <button key={id} onClick={() => selectLesson(id, 0)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left"
              style={{ background: lang === id ? bg : "transparent", color: lang === id ? color : "var(--color-text-2)", border: lang === id ? `1px solid ${color}40` : "1px solid transparent" }}
            >
              {icon} {label}
              <span className="ml-auto text-xs opacity-60">{CURRICULUM[id].filter((l) => completed.has(l.id)).length}/{CURRICULUM[id].length}</span>
            </button>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl p-3 space-y-1">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider px-1 mb-2">Lessons</p>
          {lessons.map((l, i) => {
            const done = completed.has(l.id);
            const active = i === lessonIdx;
            const locked = i > 0 && !completed.has(lessons[i - 1].id) && !done;
            const diffStyle = DIFF_LABELS[l.difficulty];
            return (
              <button key={l.id} onClick={() => !locked && selectLesson(lang, i)} disabled={locked}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                style={{ background: active ? "var(--color-primary-bg, rgba(59,130,246,0.08))" : "transparent", color: locked ? "var(--color-muted)" : "var(--color-text)", border: active ? "1px solid var(--color-primary-border, rgba(59,130,246,0.3))" : "1px solid transparent", opacity: locked ? 0.5 : 1 }}
              >
                {done ? <CheckCircle size={14} className="text-success shrink-0" /> : locked ? <Lock size={14} className="shrink-0" style={{ color: "var(--color-muted)" }} /> : <span className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: diffStyle.color }} />}
                <span className="truncate flex-1">{l.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: diffStyle.color, background: `${diffStyle.color}18` }}>{diffStyle.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-text-2">Progress</span>
            <span className="font-bold text-primary">{progress}/{lessons.length}</span>
          </div>
          <div className="h-2 rounded-full bg-bg">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress / lessons.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="lg:col-span-3 space-y-4">
        {/* Lesson info */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Code2 size={16} className="text-primary" />
            <h2 className="font-bold text-text">{lesson.title}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto" style={{ color: DIFF_LABELS[lesson.difficulty].color, background: `${DIFF_LABELS[lesson.difficulty].color}18` }}>
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
          {/* Toolbar */}
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
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowHint(!showHint)} className="text-xs px-2.5 py-1 rounded-md text-text-2 border border-border hover:border-primary/40 transition-colors">
                {showHint ? "Hide Hint" : "Hint"}
              </button>
              <button onClick={() => { setShowSolution(!showSolution); setCode(showSolution ? lesson.starterCode : lesson.solution); }} className="text-xs px-2.5 py-1 rounded-md text-text-2 border border-border hover:border-primary/40 transition-colors">
                {showSolution ? "Reset" : "Solution"}
              </button>
              <button onClick={copyCode} title="Copy code" className="p-1.5 rounded-md text-muted hover:text-text border border-border hover:border-primary/40 transition-colors">
                <Copy size={12} />
              </button>
              <button onClick={() => setShowSettings(!showSettings)} title="Editor settings" className="p-1.5 rounded-md text-muted hover:text-text border border-border hover:border-primary/40 transition-colors">
                <Settings size={12} />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-border bg-bg/80 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-2 font-medium">Theme:</span>
                {(Object.entries(THEMES) as [EditorTheme, typeof THEMES[EditorTheme]][]).map(([key, t]) => (
                  <button key={key} onClick={() => setTheme(key)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${theme === key ? "border-primary text-primary" : "border-border text-text-2 hover:border-primary/40"}`}
                    style={{ background: t.bg, color: t.text, borderColor: theme === key ? undefined : t.border }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-2 font-medium">Font:</span>
                {[12, 14, 16].map((s) => (
                  <button key={s} onClick={() => setFontSize(s)}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${fontSize === s ? "border-primary text-primary bg-primary/5" : "border-border text-text-2 hover:border-primary/40"}`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          {showHint && (
            <div className="px-4 py-2 border-b border-border bg-amber-500/5">
              <p className="text-xs text-amber-600">💡 {lesson.hint}</p>
            </div>
          )}

          {/* Editor */}
          <div className="relative">
            <textarea
              ref={taRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              onScroll={() => { if (lineNumRef.current && taRef.current) lineNumRef.current.scrollTop = taRef.current.scrollTop; }}
              spellCheck={false}
              className="w-full min-h-[220px] pl-10 pr-4 py-3 font-mono resize-y outline-none leading-relaxed"
              style={{ background: themeStyle.bg, color: themeStyle.text, fontSize, tabSize: 2 }}
            />
            {/* Line numbers */}
            <div ref={lineNumRef} className="absolute left-0 top-0 w-8 h-full overflow-hidden flex flex-col items-end pr-1.5 pt-3 pointer-events-none" style={{ background: themeStyle.bg, borderRight: `1px solid ${themeStyle.border}` }}>
              {code.split("\n").map((_, i) => (
                <div key={i} className="font-mono" style={{ fontSize: fontSize - 2, lineHeight: `${fontSize * 1.6}px`, color: themeStyle.lineNum }}>{i + 1}</div>
              ))}
            </div>

            {/* Autosuggestion popup */}
            {suggestions.length > 0 && (
              <div
                className="absolute z-50 min-w-[160px] rounded-lg border border-border shadow-xl overflow-hidden"
                style={{ top: suggPos.top, left: suggPos.left, background: themeStyle.bg, borderColor: themeStyle.border }}
              >
                <div className="px-2 py-1 border-b text-[10px] font-bold uppercase tracking-wider" style={{ color: themeStyle.lineNum, borderColor: themeStyle.border }}>
                  Suggestions <span className="opacity-50">Tab to accept</span>
                </div>
                {suggestions.map((s, i) => (
                  <button key={s} onClick={() => insertSuggestion(s)}
                    className="w-full text-left px-3 py-1.5 text-xs font-mono transition-colors"
                    style={{ background: i === suggIdx ? "rgba(59,130,246,0.2)" : "transparent", color: i === suggIdx ? "#60a5fa" : themeStyle.text }}
                    onMouseEnter={() => setSuggIdx(i)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-bg flex-wrap">
            <button onClick={runCode} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors">
              <Play size={14} /> Run Code
            </button>
            {result && (
              <div className={`flex items-center gap-2 text-sm font-medium ${result.pass ? "text-success" : "text-danger"}`}>
                {result.pass ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {result.message}
              </div>
            )}
            {result?.pass && lessonIdx < lessons.length - 1 && (
              <button onClick={nextLesson} className="ml-auto flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold text-primary border border-primary/30 hover:bg-primary/5 transition-colors">
                Next Lesson <ChevronRight size={14} />
              </button>
            )}
            <button
              onClick={() => { setAiOpen((o) => !o); setAiResponse(""); setAiError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ml-auto"
              style={aiOpen ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "var(--color-primary-bg, rgba(59,130,246,0.08))" } : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }}
            >
              <Sparkles size={12} /> AI Help
            </button>
          </div>
        </div>

        {/* AI Assistant */}
        {aiOpen && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
              <div className="flex items-center gap-2"><Sparkles size={14} className="text-primary" /><span className="text-xs font-bold text-text-2 uppercase tracking-wide">AI Coding Assistant</span></div>
              <button onClick={() => setAiOpen(false)} className="p-1 rounded hover:bg-border/60 text-muted transition-colors"><X size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border bg-bg/50">
              {["Explain my code", "Debug this", "Give me a hint", "Review my code"].map((q) => (
                <button key={q} onClick={() => { setAiQuestion(q); askAI(q); }} disabled={aiLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-text-2 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40">{q}</button>
              ))}
            </div>
            {(aiResponse || aiLoading || aiError) && (
              <div className="px-4 py-4 max-h-[300px] overflow-y-auto">
                {aiError ? <p className="text-sm text-danger">{aiError}</p>
                  : aiLoading && !aiResponse ? <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" />Thinking…</div>
                  : <pre className="text-sm text-text whitespace-pre-wrap font-mono leading-relaxed">{aiResponse}</pre>}
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-bg">
              <input type="text" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(aiQuestion); } }}
                placeholder="Ask anything about your code…" disabled={aiLoading}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-muted focus:outline-none focus:border-primary/60 disabled:opacity-40" />
              <button onClick={() => askAI(aiQuestion)} disabled={aiLoading || !aiQuestion.trim()}
                className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40">
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Live Preview (HTML/CSS only) */}
        {showPreview && (
          <div className={`bg-surface border border-border rounded-xl overflow-hidden ${previewFull ? "fixed inset-4 z-50 shadow-2xl" : ""}`}>
            <div className="px-4 py-2 border-b border-border bg-bg flex items-center justify-between">
              <span className="text-xs font-bold text-text-2">Live Preview</span>
              <button onClick={() => setPreviewFull(!previewFull)} title={previewFull ? "Exit fullscreen" : "Fullscreen preview"}
                className="p-1 rounded text-muted hover:text-text transition-colors">
                {previewFull ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
            <iframe
              srcDoc={buildPreview(lang, code)}
              title="Live Preview"
              sandbox="allow-scripts"
              className="w-full bg-white"
              style={{ minHeight: previewFull ? "calc(100% - 40px)" : 180, border: "none", display: "block" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
