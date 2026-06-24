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
      title: "Headings (h1–h6)",
      description: "HTML has six heading levels. <h1> is the most important; <h6> is the least.",
      difficulty: "beginner",
      instruction: 'Create an <h1> saying "Welcome to Nigeria" and an <h2> saying "Our Beautiful Country".',
      starterCode: "<!-- Create two headings below -->\n",
      solution: "<h1>Welcome to Nigeria</h1>\n<h2>Our Beautiful Country</h2>",
      validator: (code) => {
        const h1 = /<h1[^>]*>.*Welcome to Nigeria.*<\/h1>/i.test(code);
        const h2 = /<h2[^>]*>.*Our Beautiful Country.*<\/h2>/i.test(code);
        return { pass: h1 && h2, message: h1 && h2 ? "Both headings created!" : "Need <h1>Welcome to Nigeria</h1> and <h2>Our Beautiful Country</h2>." };
      },
      hint: "Use <h1> for the main title and <h2> for the sub-heading.",
    },
    {
      id: "html-2",
      title: "Paragraphs",
      description: "The <p> tag creates a block of paragraph text.",
      difficulty: "beginner",
      instruction: 'Create a paragraph that says "I am learning HTML".',
      starterCode: "<h1>My Page</h1>\n<!-- Add a paragraph below -->\n",
      solution: "<h1>My Page</h1>\n<p>I am learning HTML</p>",
      validator: (code) => {
        const has = /<p[^>]*>.*I am learning HTML.*<\/p>/i.test(code);
        return { pass: has, message: has ? "Paragraph created!" : "Use the <p> tag for paragraphs." };
      },
      hint: "Use <p>Your text here</p>.",
    },
    {
      id: "html-3",
      title: "Links",
      description: "The <a> tag creates clickable links using the href attribute.",
      difficulty: "beginner",
      instruction: 'Create a link that says "Visit Google" and points to https://google.com.',
      starterCode: "<!-- Create a link below -->\n",
      solution: '<a href="https://google.com">Visit Google</a>',
      validator: (code) => {
        const has = /<a\s+href=["']https?:\/\/google\.com["'][^>]*>.*Visit Google.*<\/a>/i.test(code);
        return { pass: has, message: has ? "Link works!" : 'Use <a href="https://google.com">Visit Google</a>.' };
      },
      hint: 'Links need an href attribute: <a href="url">text</a>.',
    },
    {
      id: "html-4",
      title: "Images",
      description: "The <img> tag embeds images. It uses src for the file path and alt for accessibility.",
      difficulty: "beginner",
      instruction: 'Add an image with src="flag.jpg" and alt="Nigerian flag".',
      starterCode: "<!-- Add an image below -->\n",
      solution: '<img src="flag.jpg" alt="Nigerian flag" />',
      validator: (code) => {
        const hasSrc = /src=["']flag\.jpg["']/i.test(code);
        const hasAlt = /alt=["']Nigerian flag["']/i.test(code);
        return { pass: hasSrc && hasAlt, message: hasSrc && hasAlt ? "Image added!" : 'Need src="flag.jpg" and alt="Nigerian flag".' };
      },
      hint: 'Use <img src="path" alt="description" />.',
    },
    {
      id: "html-5",
      title: "Unordered Lists",
      description: "The <ul> tag creates a bullet list. Each item uses <li>.",
      difficulty: "beginner",
      instruction: "Create an unordered list with three subjects: Mathematics, Physics, Chemistry.",
      starterCode: "<!-- Create a bullet list -->\n",
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
      id: "html-6",
      title: "Ordered Lists",
      description: "The <ol> tag creates a numbered list. Items are still <li> tags.",
      difficulty: "beginner",
      instruction: "Create a numbered list with three steps: Wake up, Brush teeth, Eat breakfast.",
      starterCode: "<!-- Create a numbered list -->\n",
      solution: "<ol>\n  <li>Wake up</li>\n  <li>Brush teeth</li>\n  <li>Eat breakfast</li>\n</ol>",
      validator: (code) => {
        const hasOl = /<ol/i.test(code);
        const items = (code.match(/<li/gi) || []).length;
        const pass = hasOl && items >= 3;
        return { pass, message: pass ? "Numbered list created!" : `Need an <ol> with 3 <li> items. Found ${items}.` };
      },
      hint: "Use <ol> for numbered lists — same <li> items inside.",
    },
    {
      id: "html-7",
      title: "Tables",
      description: "Tables organise data in rows and columns using <table>, <tr>, <th>, and <td>.",
      difficulty: "intermediate",
      instruction: "Create a table with a header row (Name, Score) and one data row (Amaka, 85).",
      starterCode: "<!-- Create a table -->\n",
      solution: "<table>\n  <tr>\n    <th>Name</th>\n    <th>Score</th>\n  </tr>\n  <tr>\n    <td>Amaka</td>\n    <td>85</td>\n  </tr>\n</table>",
      validator: (code) => {
        const hasTable = /<table/i.test(code);
        const hasTh = /<th/i.test(code);
        const hasTd = /<td/i.test(code);
        const pass = hasTable && hasTh && hasTd;
        return { pass, message: pass ? "Table built!" : "Need <table> with <th> header cells and <td> data cells." };
      },
      hint: "Use <tr> for rows, <th> for headers, <td> for data cells.",
    },
    {
      id: "html-8",
      title: "Forms & Text Inputs",
      description: "Forms collect user input. Use <form>, <input>, and <button>.",
      difficulty: "intermediate",
      instruction: 'Create a form with a text input (name="username", placeholder="Enter name") and a submit button.',
      starterCode: "<!-- Build a form -->\n",
      solution: '<form>\n  <input type="text" name="username" placeholder="Enter name" />\n  <button type="submit">Submit</button>\n</form>',
      validator: (code) => {
        const hasForm = /<form/i.test(code);
        const hasInput = /name=["']username["']/i.test(code);
        const hasBtn = /<button/i.test(code);
        const pass = hasForm && hasInput && hasBtn;
        return { pass, message: pass ? "Form built!" : 'Need a <form> with an input (name="username") and a button.' };
      },
      hint: 'Use <input type="text" name="username" /> inside a <form>.',
    },
    {
      id: "html-9",
      title: "Input Types",
      description: "HTML provides many input types: email, number, date, password, and more.",
      difficulty: "intermediate",
      instruction: 'Create three inputs: type="email" (name="email"), type="number" (name="age"), and type="password" (name="pass").',
      starterCode: "<form>\n  <!-- Add three inputs -->\n</form>",
      solution: '<form>\n  <input type="email" name="email" />\n  <input type="number" name="age" />\n  <input type="password" name="pass" />\n</form>',
      validator: (code) => {
        const hasEmail = /type=["']email["']/i.test(code);
        const hasNumber = /type=["']number["']/i.test(code);
        const hasPass = /type=["']password["']/i.test(code);
        const pass = hasEmail && hasNumber && hasPass;
        return { pass, message: pass ? "All input types used!" : 'Need type="email", type="number", and type="password".' };
      },
      hint: 'Change the type attribute: <input type="email" />, <input type="number" />, <input type="password" />.',
    },
    {
      id: "html-10",
      title: "Checkboxes & Radio Buttons",
      description: "Checkboxes allow multiple selections; radio buttons allow only one choice from a group.",
      difficulty: "intermediate",
      instruction: 'Create 2 radio buttons with name="gender": one value="male" labelled "Male" and one value="female" labelled "Female".',
      starterCode: "<!-- Create radio buttons -->\n",
      solution: '<label><input type="radio" name="gender" value="male" /> Male</label>\n<label><input type="radio" name="gender" value="female" /> Female</label>',
      validator: (code) => {
        const count = (code.match(/type=["']radio["']/gi) || []).length;
        const sameName = (code.match(/name=["']gender["']/gi) || []).length >= 2;
        const pass = count >= 2 && sameName;
        return { pass, message: pass ? "Radio buttons work!" : 'Need 2 <input type="radio" name="gender"> buttons.' };
      },
      hint: 'Both radio buttons need the same name="gender" to work as a group.',
    },
    {
      id: "html-11",
      title: "Semantic HTML",
      description: "Semantic tags like <header>, <nav>, <main>, <section>, and <footer> give meaning to your layout.",
      difficulty: "intermediate",
      instruction: "Create a page structure with a <header>, a <main>, and a <footer>. Put any content inside each.",
      starterCode: "<!-- Use semantic HTML -->\n",
      solution: "<header>My School</header>\n<main>\n  <p>Welcome to our school website.</p>\n</main>\n<footer>&copy; 2024</footer>",
      validator: (code) => {
        const hasHeader = /<header/i.test(code);
        const hasMain = /<main/i.test(code);
        const hasFooter = /<footer/i.test(code);
        const pass = hasHeader && hasMain && hasFooter;
        return { pass, message: pass ? "Semantic structure built!" : "Need <header>, <main>, and <footer> elements." };
      },
      hint: "Semantic tags describe purpose: <header>, <main>, <footer>.",
    },
    {
      id: "html-12",
      title: "Div & Span",
      description: "<div> is a block-level container. <span> is an inline container for styling part of text.",
      difficulty: "intermediate",
      instruction: 'Wrap a paragraph in a <div class="box">. Inside, wrap the word "Nigeria" in a <span class="highlight">.',
      starterCode: "<!-- Use div and span -->\n",
      solution: '<div class="box">\n  <p>Welcome to <span class="highlight">Nigeria</span>!</p>\n</div>',
      validator: (code) => {
        const hasDiv = /<div[^>]+class=["'][^"']*box[^"']*["']/i.test(code);
        const hasSpan = /<span[^>]+class=["'][^"']*highlight[^"']*["']/i.test(code);
        const pass = hasDiv && hasSpan;
        return { pass, message: pass ? "Div and span used correctly!" : 'Need <div class="box"> and <span class="highlight">.' };
      },
      hint: 'Add class attributes: <div class="box"> and <span class="highlight">.',
    },
    {
      id: "html-13",
      title: "Meta Tags",
      description: "<meta> tags go inside <head> and tell browsers and search engines about your page.",
      difficulty: "intermediate",
      instruction: 'Inside a <head>, add <meta charset="UTF-8"> and <meta name="description" content="My school website">.',
      starterCode: "<head>\n  <title>My Page</title>\n  <!-- Add meta tags -->\n</head>",
      solution: '<head>\n  <title>My Page</title>\n  <meta charset="UTF-8" />\n  <meta name="description" content="My school website" />\n</head>',
      validator: (code) => {
        const hasCharset = /charset=["']UTF-8["']/i.test(code);
        const hasMeta = /<meta[^>]+name=["']description["']/i.test(code);
        const pass = hasCharset && hasMeta;
        return { pass, message: pass ? "Meta tags added!" : 'Need <meta charset="UTF-8"> and <meta name="description">.' };
      },
      hint: 'Use <meta charset="UTF-8"> and <meta name="description" content="..."> inside <head>.',
    },
    {
      id: "html-14",
      title: "Figures & Captions",
      description: "<figure> groups self-contained content like images; <figcaption> provides the caption.",
      difficulty: "intermediate",
      instruction: 'Create a <figure> containing an <img src="map.jpg" alt="Nigeria map"> and a <figcaption>Map of Nigeria</figcaption>.',
      starterCode: "<!-- Create a figure with caption -->\n",
      solution: '<figure>\n  <img src="map.jpg" alt="Nigeria map" />\n  <figcaption>Map of Nigeria</figcaption>\n</figure>',
      validator: (code) => {
        const hasFig = /<figure/i.test(code);
        const hasCaption = /<figcaption[^>]*>.*Map of Nigeria.*<\/figcaption>/i.test(code);
        const pass = hasFig && hasCaption;
        return { pass, message: pass ? "Figure with caption created!" : "Need <figure> wrapping an <img> and <figcaption>Map of Nigeria</figcaption>." };
      },
      hint: "Put <img> and <figcaption> inside a <figure> element.",
    },
    {
      id: "html-15",
      title: "Audio & Video",
      description: "HTML5 supports native audio and video embedding without plugins.",
      difficulty: "advanced",
      instruction: 'Create an <audio controls> element with a <source src="anthem.mp3" type="audio/mpeg"> inside.',
      starterCode: "<!-- Embed audio -->\n",
      solution: '<audio controls>\n  <source src="anthem.mp3" type="audio/mpeg" />\n  Your browser does not support audio.\n</audio>',
      validator: (code) => {
        const hasAudio = /<audio/i.test(code);
        const hasSource = /<source[^>]+src=["']anthem\.mp3["']/i.test(code);
        const pass = hasAudio && hasSource;
        return { pass, message: pass ? "Audio embedded!" : 'Need <audio controls> with <source src="anthem.mp3" type="audio/mpeg">.' };
      },
      hint: 'Use <audio controls> and nest <source src="anthem.mp3" type="audio/mpeg"> inside it.',
    },
    {
      id: "html-16",
      title: "Accessibility (a11y)",
      description: "Good HTML is accessible. Use alt on images and aria-label on interactive elements for screen readers.",
      difficulty: "advanced",
      instruction: 'Create a <button aria-label="Close menu">X</button> and an <img src="logo.png" alt="School logo">.',
      starterCode: "<!-- Create accessible elements -->\n",
      solution: '<button aria-label="Close menu">X</button>\n<img src="logo.png" alt="School logo" />',
      validator: (code) => {
        const hasAriaLabel = /aria-label=["']Close menu["']/i.test(code);
        const hasAlt = /alt=["']School logo["']/i.test(code);
        const pass = hasAriaLabel && hasAlt;
        return { pass, message: pass ? "Accessible markup!" : 'Need aria-label="Close menu" on a button and alt="School logo" on an image.' };
      },
      hint: 'Add aria-label to the button and alt to the image for screen readers.',
    },
    {
      id: "html-17",
      title: "iframes",
      description: "The <iframe> tag embeds another webpage inside your page — used for maps and video players.",
      difficulty: "advanced",
      instruction: 'Create an <iframe> with src="https://example.com", width="400", and height="300".',
      starterCode: "<!-- Embed an iframe -->\n",
      solution: '<iframe src="https://example.com" width="400" height="300"></iframe>',
      validator: (code) => {
        const hasSrc = /src=["']https?:\/\/example\.com["']/i.test(code);
        const hasW = /width=["']400["']/i.test(code);
        const hasH = /height=["']300["']/i.test(code);
        const pass = hasSrc && hasW && hasH;
        return { pass, message: pass ? "iframe embedded!" : 'Need <iframe src="https://example.com" width="400" height="300">.' };
      },
      hint: 'Use <iframe src="url" width="400" height="300"></iframe>.',
    },
    {
      id: "html-18",
      title: "HTML Entities",
      description: "Special characters need entity codes: &lt; for <, &gt; for >, &amp; for &, &copy; for ©.",
      difficulty: "advanced",
      instruction: 'Write a paragraph displaying: 5 < 10 & 10 > 5 © 2024 using HTML entities.',
      starterCode: "<!-- Use HTML entities -->\n",
      solution: "<p>5 &lt; 10 &amp; 10 &gt; 5 &copy; 2024</p>",
      validator: (code) => {
        const hasLt = /&lt;/i.test(code);
        const hasGt = /&gt;/i.test(code);
        const hasAmp = /&amp;/i.test(code);
        const hasCopy = /&copy;/i.test(code);
        const pass = hasLt && hasGt && hasAmp && hasCopy;
        return { pass, message: pass ? "Entities used correctly!" : "Need &lt; &gt; &amp; and &copy; in your paragraph." };
      },
      hint: "< is &lt;  > is &gt;  & is &amp;  © is &copy;",
    },
  ],
  css: [
    {
      id: "css-1",
      title: "Text Color",
      description: "The color property sets the text colour of an element.",
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
      description: "background-color sets the fill colour; padding adds space inside the element border.",
      difficulty: "beginner",
      instruction: "Give .card a light grey background (#f0f0f0) and 20px padding.",
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
      title: "Font & Text Styling",
      description: "CSS controls font-size, font-weight, font-family, and text-align.",
      difficulty: "beginner",
      instruction: "Style the p tag: font-size 18px, font-weight bold, and text-align center.",
      starterCode: "p {\n  /* Style the paragraph text */\n  \n}",
      solution: "p {\n  font-size: 18px;\n  font-weight: bold;\n  text-align: center;\n}",
      validator: (code) => {
        const hasSize = /font-size\s*:\s*18px/i.test(code);
        const hasWeight = /font-weight\s*:\s*bold/i.test(code);
        const hasAlign = /text-align\s*:\s*center/i.test(code);
        const pass = hasSize && hasWeight && hasAlign;
        return { pass, message: pass ? "Text styled!" : "Need font-size: 18px, font-weight: bold, and text-align: center." };
      },
      hint: "Three separate properties: font-size, font-weight, text-align.",
    },
    {
      id: "css-4",
      title: "Box Model",
      description: "Every element has margin (outside), border, padding (inside), and content. This is the CSS box model.",
      difficulty: "beginner",
      instruction: "Give .card a 2px solid black border and a 16px margin.",
      starterCode: ".card {\n  background-color: #f0f0f0;\n  padding: 16px;\n  /* Add border and margin */\n  \n}",
      solution: ".card {\n  background-color: #f0f0f0;\n  padding: 16px;\n  border: 2px solid black;\n  margin: 16px;\n}",
      validator: (code) => {
        const hasBorder = /border\s*:\s*2px\s+solid\s+black/i.test(code);
        const hasMargin = /margin\s*:\s*16px/i.test(code);
        const pass = hasBorder && hasMargin;
        return { pass, message: pass ? "Box model applied!" : "Need border: 2px solid black and margin: 16px." };
      },
      hint: "Use border: 2px solid black; and margin: 16px;",
    },
    {
      id: "css-5",
      title: "CSS Selectors",
      description: "Target elements by tag name, class (.), or ID (#) — each with different specificity.",
      difficulty: "intermediate",
      instruction: "Write three rules: h1 text red; .highlight background yellow; #title text underlined.",
      starterCode: "/* Style using tag, class, and ID selectors */\n",
      solution: "h1 {\n  color: red;\n}\n.highlight {\n  background-color: yellow;\n}\n#title {\n  text-decoration: underline;\n}",
      validator: (code) => {
        const hasTag = /h1\s*\{[^}]*color\s*:\s*red/i.test(code);
        const hasClass = /\.highlight\s*\{[^}]*background(-color)?\s*:\s*yellow/i.test(code);
        const hasId = /#title\s*\{[^}]*text-decoration\s*:\s*underline/i.test(code);
        const pass = hasTag && hasClass && hasId;
        return { pass, message: pass ? "All three selectors work!" : "Need h1{color:red}, .highlight{background-color:yellow}, #title{text-decoration:underline}." };
      },
      hint: "Tags: h1 { }. Classes: .highlight { }. IDs: #title { }.",
    },
    {
      id: "css-6",
      title: "Pseudo-classes",
      description: "Pseudo-classes style elements in specific states: :hover (mouse over), :focus (keyboard focus).",
      difficulty: "intermediate",
      instruction: "Make button turn green (background-color: green; color: white) on hover. Add a 2px solid blue outline on focus.",
      starterCode: "button {\n  padding: 10px 20px;\n  cursor: pointer;\n}\n/* Add hover and focus states */\n",
      solution: "button {\n  padding: 10px 20px;\n  cursor: pointer;\n}\nbutton:hover {\n  background-color: green;\n  color: white;\n}\nbutton:focus {\n  outline: 2px solid blue;\n}",
      validator: (code) => {
        const hasHover = /button:hover\s*\{/i.test(code) || /button\s*:\s*hover\s*\{/i.test(code);
        const hasFocus = /button:focus\s*\{/i.test(code) || /button\s*:\s*focus\s*\{/i.test(code);
        const pass = hasHover && hasFocus;
        return { pass, message: pass ? "Pseudo-classes applied!" : "Need button:hover { background-color: green } and button:focus { outline: 2px solid blue }." };
      },
      hint: "Write button:hover { ... } and button:focus { ... } as separate rule blocks.",
    },
    {
      id: "css-7",
      title: "Positioning",
      description: "position: relative makes an element the reference point for children with position: absolute.",
      difficulty: "intermediate",
      instruction: "Give .container position: relative. Give .badge position: absolute, top: 0, right: 0.",
      starterCode: ".container {\n  width: 200px;\n  height: 200px;\n  background: #eee;\n  /* position: relative */\n}\n.badge {\n  width: 30px;\n  height: 30px;\n  background: red;\n  /* position: absolute */\n}",
      solution: ".container {\n  position: relative;\n  width: 200px;\n  height: 200px;\n  background: #eee;\n}\n.badge {\n  position: absolute;\n  top: 0;\n  right: 0;\n  width: 30px;\n  height: 30px;\n  background: red;\n}",
      validator: (code) => {
        const hasRel = /\.container\s*\{[^}]*position\s*:\s*relative/i.test(code);
        const hasAbs = /\.badge\s*\{[^}]*position\s*:\s*absolute/i.test(code);
        const hasTop = /top\s*:\s*0/i.test(code);
        const pass = hasRel && hasAbs && hasTop;
        return { pass, message: pass ? "Positioned!" : "Need .container{position:relative} and .badge{position:absolute;top:0;right:0}." };
      },
      hint: "Parent needs position: relative so child's position: absolute is relative to it.",
    },
    {
      id: "css-8",
      title: "Flexbox Basics",
      description: "display: flex creates a flexible row. justify-content aligns horizontally; align-items aligns vertically.",
      difficulty: "intermediate",
      instruction: "Make .container a flex container with items centred both horizontally and vertically.",
      starterCode: ".container {\n  height: 200px;\n  background: #eee;\n  /* Center items with flexbox */\n}",
      solution: ".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 200px;\n  background: #eee;\n}",
      validator: (code) => {
        const hasFlex = /display\s*:\s*flex/i.test(code);
        const hasJC = /justify-content\s*:\s*center/i.test(code);
        const hasAI = /align-items\s*:\s*center/i.test(code);
        return { pass: hasFlex && hasJC && hasAI, message: hasFlex && hasJC && hasAI ? "Perfectly centred!" : "Need display: flex, justify-content: center, align-items: center." };
      },
      hint: "Flexbox needs: display: flex, justify-content: center, align-items: center.",
    },
    {
      id: "css-9",
      title: "Flexbox Direction & Wrap",
      description: "flex-direction changes the axis (row or column). flex-wrap allows items to wrap onto the next line.",
      difficulty: "intermediate",
      instruction: "Make .container a column flex container (items stack vertically) with flex-wrap: wrap and a 12px gap.",
      starterCode: ".container {\n  display: flex;\n  background: #eee;\n  /* Add direction, wrap, and gap */\n}",
      solution: ".container {\n  display: flex;\n  flex-direction: column;\n  flex-wrap: wrap;\n  gap: 12px;\n  background: #eee;\n}",
      validator: (code) => {
        const hasDir = /flex-direction\s*:\s*column/i.test(code);
        const hasWrap = /flex-wrap\s*:\s*wrap/i.test(code);
        const hasGap = /gap\s*:\s*12px/i.test(code);
        const pass = hasDir && hasWrap && hasGap;
        return { pass, message: pass ? "Flex direction set!" : "Need flex-direction: column, flex-wrap: wrap, and gap: 12px." };
      },
      hint: "Add flex-direction: column; flex-wrap: wrap; gap: 12px; to your flex container.",
    },
    {
      id: "css-10",
      title: "CSS Grid Basics",
      description: "display: grid creates a two-dimensional layout. grid-template-columns defines the column sizes.",
      difficulty: "advanced",
      instruction: "Create a 3-column equal grid with a 16px gap.",
      starterCode: ".grid {\n  /* Create a 3-column grid */\n  \n}",
      solution: ".grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 16px;\n}",
      validator: (code) => {
        const hasGrid = /display\s*:\s*grid/i.test(code);
        const hasCols = /grid-template-columns/i.test(code);
        const hasGap = /gap\s*:\s*16px/i.test(code);
        return { pass: hasGrid && hasCols && hasGap, message: hasGrid && hasCols && hasGap ? "Grid ready!" : "Need display: grid, grid-template-columns: 1fr 1fr 1fr, and gap: 16px." };
      },
      hint: "Use grid-template-columns: 1fr 1fr 1fr for 3 equal columns.",
    },
    {
      id: "css-11",
      title: "Grid Template Areas",
      description: "grid-template-areas lets you name layout regions and place items into them by name.",
      difficulty: "advanced",
      instruction: 'Define a grid with a full-width "header" on the first row and "sidebar" + "content" on the second row.',
      starterCode: ".page {\n  display: grid;\n  /* Define named areas */\n}",
      solution: '.page {\n  display: grid;\n  grid-template-areas:\n    "header header"\n    "sidebar content";\n  grid-template-columns: 200px 1fr;\n}',
      validator: (code) => {
        const hasAreas = /grid-template-areas/i.test(code);
        const hasHeader = /["'][^"']*header[^"']*header[^"']*["']/i.test(code);
        const pass = hasAreas && hasHeader;
        return { pass, message: pass ? "Grid areas defined!" : 'Need grid-template-areas with "header header" and "sidebar content" rows.' };
      },
      hint: 'Use grid-template-areas: "header header" "sidebar content";',
    },
    {
      id: "css-12",
      title: "Transitions",
      description: "CSS transitions animate property changes smoothly over a given duration.",
      difficulty: "advanced",
      instruction: "Add a transition to a button so background-color changes smoothly over 0.3s ease on hover.",
      starterCode: "button {\n  background-color: #3b82f6;\n  color: white;\n  padding: 10px 20px;\n  border: none;\n  cursor: pointer;\n  /* Add transition */\n}\nbutton:hover {\n  background-color: #1d4ed8;\n}",
      solution: "button {\n  background-color: #3b82f6;\n  color: white;\n  padding: 10px 20px;\n  border: none;\n  cursor: pointer;\n  transition: background-color 0.3s ease;\n}\nbutton:hover {\n  background-color: #1d4ed8;\n}",
      validator: (code) => {
        const hasTransition = /transition\s*:/i.test(code);
        const hasDuration = /0\.3s/i.test(code);
        const pass = hasTransition && hasDuration;
        return { pass, message: pass ? "Transition added!" : "Need transition: background-color 0.3s ease inside the button rule (not :hover)." };
      },
      hint: "Add transition: background-color 0.3s ease; to the button base rule (not :hover).",
    },
    {
      id: "css-13",
      title: "CSS Animations",
      description: "@keyframes defines animation steps. The animation property applies it to an element.",
      difficulty: "advanced",
      instruction: 'Create @keyframes "fadeIn" from opacity 0 to opacity 1. Apply it to .box with 1s duration.',
      starterCode: "/* Define animation and apply it */\n.box {\n  width: 100px;\n  height: 100px;\n  background: #3b82f6;\n}",
      solution: '@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n.box {\n  width: 100px;\n  height: 100px;\n  background: #3b82f6;\n  animation: fadeIn 1s;\n}',
      validator: (code) => {
        const hasKeyframes = /@keyframes\s+fadeIn/i.test(code);
        const hasAnimation = /animation\s*:\s*fadeIn\s+1s/i.test(code) || /animation-name\s*:\s*fadeIn/i.test(code);
        const pass = hasKeyframes && hasAnimation;
        return { pass, message: pass ? "Animation created!" : 'Need @keyframes fadeIn { from{opacity:0} to{opacity:1} } and animation: fadeIn 1s on .box.' };
      },
      hint: 'Define @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }, then add animation: fadeIn 1s; to .box.',
    },
    {
      id: "css-14",
      title: "CSS Variables",
      description: "CSS custom properties store reusable values. Define on :root with --name: value; use with var(--name).",
      difficulty: "advanced",
      instruction: "Define --primary-color: #3b82f6 and --font-size: 16px on :root. Use both on .card.",
      starterCode: ":root {\n  /* Define your variables */\n}\n.card {\n  /* Use the variables */\n  padding: 20px;\n}",
      solution: ":root {\n  --primary-color: #3b82f6;\n  --font-size: 16px;\n}\n.card {\n  color: var(--primary-color);\n  font-size: var(--font-size);\n  padding: 20px;\n}",
      validator: (code) => {
        const hasVar1 = /--primary-color\s*:\s*#3b82f6/i.test(code);
        const hasVar2 = /--font-size\s*:\s*16px/i.test(code);
        const hasUsage = /var\(--primary-color\)/i.test(code) || /var\(--font-size\)/i.test(code);
        const pass = hasVar1 && hasVar2 && hasUsage;
        return { pass, message: pass ? "CSS variables working!" : "Need --primary-color and --font-size on :root, then use them with var()." };
      },
      hint: "Define with --variable-name: value on :root. Use with var(--variable-name).",
    },
    {
      id: "css-15",
      title: "Media Queries",
      description: "@media applies CSS only when screen conditions match — the foundation of responsive design.",
      difficulty: "advanced",
      instruction: "Write a media query so that when the screen is 600px or narrower, .container switches to flex-direction: column.",
      starterCode: ".container {\n  display: flex;\n  flex-direction: row;\n  gap: 16px;\n}\n/* Add media query below */\n",
      solution: ".container {\n  display: flex;\n  flex-direction: row;\n  gap: 16px;\n}\n@media (max-width: 600px) {\n  .container {\n    flex-direction: column;\n  }\n}",
      validator: (code) => {
        const hasMedia = /@media\s*\(/i.test(code);
        const hasMax = /max-width\s*:\s*600px/i.test(code);
        const hasColumn = /flex-direction\s*:\s*column/i.test(code);
        const pass = hasMedia && hasMax && hasColumn;
        return { pass, message: pass ? "Responsive layout!" : "Need @media (max-width: 600px) { .container { flex-direction: column } }." };
      },
      hint: "Use @media (max-width: 600px) { ... } and put the responsive styles inside.",
    },
    {
      id: "css-16",
      title: "CSS Transform",
      description: "transform lets you rotate, scale, skew, or translate elements without affecting layout flow.",
      difficulty: "advanced",
      instruction: "On .card:hover, rotate it 5 degrees and scale it to 1.05.",
      starterCode: ".card {\n  width: 150px;\n  height: 150px;\n  background: #3b82f6;\n  transition: transform 0.3s;\n}\n/* Add hover transform */\n",
      solution: ".card {\n  width: 150px;\n  height: 150px;\n  background: #3b82f6;\n  transition: transform 0.3s;\n}\n.card:hover {\n  transform: rotate(5deg) scale(1.05);\n}",
      validator: (code) => {
        const hasHover = /\.card:hover\s*\{|\.card\s*:\s*hover\s*\{/i.test(code);
        const hasRotate = /rotate\s*\(\s*5deg\s*\)/i.test(code);
        const hasScale = /scale\s*\(\s*1\.05\s*\)/i.test(code);
        const pass = hasHover && hasRotate && hasScale;
        return { pass, message: pass ? "Transform applied!" : "Need .card:hover { transform: rotate(5deg) scale(1.05); }." };
      },
      hint: "Combine multiple transforms: transform: rotate(5deg) scale(1.05);",
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
      description: "Store values in variables and display them with print().",
      difficulty: "beginner",
      instruction: 'Create name = "Nigeria" and capital = "Abuja". Print both on separate lines.',
      starterCode: "# Create and print variables\n",
      solution: 'name = "Nigeria"\ncapital = "Abuja"\nprint(name)\nprint(capital)',
      validator: (code) => {
        const hasName = /name\s*=\s*["']/i.test(code);
        const hasPrint = (code.match(/print\s*\(/gi) || []).length >= 2;
        return { pass: hasName && hasPrint, message: hasName && hasPrint ? "Variables printed!" : "Need name = '...' and capital = '...' with two print() calls." };
      },
      hint: "Python uses = to assign: name = 'Nigeria'. Use print(name) to output.",
    },
    {
      id: "py-2",
      title: "Data Types",
      description: "Python has str, int, float, and bool types. Variables take the type of their assigned value.",
      difficulty: "beginner",
      instruction: 'Create: school = "TeachFlow" (str), year = 2024 (int), gpa = 4.5 (float), active = True (bool). Print each.',
      starterCode: "# Create different data types\n",
      solution: 'school = "TeachFlow"\nyear = 2024\ngpa = 4.5\nactive = True\nprint(school)\nprint(year)\nprint(gpa)\nprint(active)',
      validator: (code) => {
        const hasStr = /school\s*=\s*["']/i.test(code);
        const hasInt = /year\s*=\s*2024/i.test(code);
        const hasFloat = /gpa\s*=\s*4\.5/i.test(code);
        const hasBool = /active\s*=\s*True/i.test(code);
        const pass = hasStr && hasInt && hasFloat && hasBool;
        return { pass, message: pass ? "All data types created!" : "Need school = '...', year = 2024, gpa = 4.5, active = True." };
      },
      hint: "Strings use quotes, integers are whole numbers, floats have decimals, booleans are True or False.",
    },
    {
      id: "py-3",
      title: "If / Elif / Else",
      description: "Conditionals make decisions. Python uses if, elif, and else with a colon and indentation.",
      difficulty: "beginner",
      instruction: 'Set score = 65. Print "A" if >= 70, "B" if >= 60, "C" if >= 50, else "F".',
      starterCode: "score = 65\n# Write your if/elif/else\n",
      solution: 'score = 65\nif score >= 70:\n    print("A")\nelif score >= 60:\n    print("B")\nelif score >= 50:\n    print("C")\nelse:\n    print("F")',
      validator: (code) => {
        const hasIf = /if\s+score\s*>=\s*70\s*:/i.test(code);
        const hasElif = /elif/i.test(code);
        const hasElse = /else\s*:/i.test(code);
        const pass = hasIf && hasElif && hasElse;
        return { pass, message: pass ? "Grading logic works!" : "Need if score >= 70:, elif blocks, and else: block." };
      },
      hint: "Python uses elif (not else if). Each condition ends with a colon: if score >= 70:",
    },
    {
      id: "py-4",
      title: "While Loops",
      description: "A while loop repeats as long as a condition is True. Always include code to stop it.",
      difficulty: "beginner",
      instruction: "Write a while loop that prints numbers 1 to 5. Start with count = 1.",
      starterCode: "count = 1\n# Write a while loop\n",
      solution: "count = 1\nwhile count <= 5:\n    print(count)\n    count += 1",
      validator: (code) => {
        const hasWhile = /while\s+count\s*<=\s*5\s*:/i.test(code) || /while\s+count\s*<\s*6\s*:/i.test(code);
        const hasPrint = /print\s*\(/i.test(code);
        const hasIncrement = /count\s*\+=\s*1/i.test(code) || /count\s*=\s*count\s*\+\s*1/i.test(code);
        const pass = hasWhile && hasPrint && hasIncrement;
        return { pass, message: pass ? "While loop works!" : "Need while count <= 5:, print(count), and count += 1." };
      },
      hint: "while count <= 5: then print(count) then count += 1 (indented inside the loop).",
    },
    {
      id: "py-5",
      title: "Lists & For Loops",
      description: "Lists store ordered collections. For loops iterate over each item.",
      difficulty: "intermediate",
      instruction: 'Create subjects = ["Math", "Physics", "Biology"] and use a for loop to print each subject.',
      starterCode: "# Create a list and loop through it\n",
      solution: 'subjects = ["Math", "Physics", "Biology"]\nfor subject in subjects:\n    print(subject)',
      validator: (code) => {
        const hasList = /subjects\s*=\s*\[/i.test(code);
        const hasFor = /for\s+\w+\s+in\s+subjects\s*:/i.test(code);
        const pass = hasList && hasFor;
        return { pass, message: pass ? "Looping!" : "Need subjects = [...] and for subject in subjects:" };
      },
      hint: "Python for loops: for item in list:",
    },
    {
      id: "py-6",
      title: "Functions & Return",
      description: "Define reusable blocks with def. Use return to send a value back to the caller.",
      difficulty: "intermediate",
      instruction: "Write calculate_grade(score) that returns 'A' if >= 70, 'B' if >= 60, 'C' if >= 50, else 'F'.",
      starterCode: "# Define the grading function\n",
      solution: 'def calculate_grade(score):\n    if score >= 70:\n        return "A"\n    elif score >= 60:\n        return "B"\n    elif score >= 50:\n        return "C"\n    else:\n        return "F"',
      validator: (code) => {
        const hasDef = /def\s+calculate_grade\s*\(\s*score\s*\)\s*:/i.test(code);
        const hasReturn = /return\s+["']A["']/i.test(code);
        const hasElif = /elif/i.test(code);
        return { pass: hasDef && hasReturn && hasElif, message: hasDef && hasReturn && hasElif ? "Function defined!" : "Need def calculate_grade(score): with if/elif/else returning grades." };
      },
      hint: "Use def function_name(param): with if/elif/else and return.",
    },
    {
      id: "py-7",
      title: "String Methods",
      description: "Strings have built-in methods: upper(), lower(), strip(), split(), replace(), and more.",
      difficulty: "intermediate",
      instruction: 'Start with text = "  hello world  ". Strip spaces, convert to uppercase, replace "WORLD" with "NIGERIA". Print the result.',
      starterCode: 'text = "  hello world  "\n# Apply string methods\n',
      solution: 'text = "  hello world  "\nresult = text.strip().upper().replace("WORLD", "NIGERIA")\nprint(result)',
      validator: (code) => {
        const hasStrip = /\.strip\(\)/i.test(code);
        const hasUpper = /\.upper\(\)/i.test(code);
        const hasReplace = /\.replace\s*\(/i.test(code);
        const pass = hasStrip && hasUpper && hasReplace;
        return { pass, message: pass ? "String methods chained!" : "Need .strip(), .upper(), and .replace() on the text variable." };
      },
      hint: "Chain methods: text.strip().upper().replace('WORLD', 'NIGERIA').",
    },
    {
      id: "py-8",
      title: "Tuples & Sets",
      description: "Tuples are immutable ordered collections (parentheses). Sets store only unique values (curly braces).",
      difficulty: "intermediate",
      instruction: 'Create coordinates = (6.5, 3.3) and unique_subjects = {"Math", "Physics", "Math"}. Print both.',
      starterCode: "# Create a tuple and a set\n",
      solution: 'coordinates = (6.5, 3.3)\nunique_subjects = {"Math", "Physics", "Math"}\nprint(coordinates)\nprint(unique_subjects)',
      validator: (code) => {
        const hasTuple = /coordinates\s*=\s*\(/i.test(code);
        const hasSet = /unique_subjects\s*=\s*\{/i.test(code);
        const pass = hasTuple && hasSet;
        return { pass, message: pass ? "Tuple and set created!" : "Need coordinates = (6.5, 3.3) and unique_subjects = {...}." };
      },
      hint: "Tuples use (): (6.5, 3.3). Sets use {}: {'Math', 'Physics'}.",
    },
    {
      id: "py-9",
      title: "Dictionaries",
      description: "Dictionaries store key-value pairs. Access values with dict['key'] or dict.get('key').",
      difficulty: "intermediate",
      instruction: 'Create student = {"name": "Amaka", "age": 16, "grade": "SS2"}. Print the value for "name".',
      starterCode: "# Create a dictionary\n",
      solution: 'student = {"name": "Amaka", "age": 16, "grade": "SS2"}\nprint(student["name"])',
      validator: (code) => {
        const hasDict = /student\s*=\s*\{/i.test(code);
        const hasName = /["']name["']\s*:/i.test(code);
        const hasPrint = /print\s*\(\s*student\s*\[/i.test(code) || /print\s*\(\s*student\.get/i.test(code);
        const pass = hasDict && hasName && hasPrint;
        return { pass, message: pass ? "Dictionary created!" : "Need student = {'name': ..., 'age': ..., 'grade': ...} and print(student['name'])." };
      },
      hint: "Access dictionary values: student['name'] or student.get('name').",
    },
    {
      id: "py-10",
      title: "Exception Handling",
      description: "try/except catches errors so your program handles problems gracefully instead of crashing.",
      difficulty: "advanced",
      instruction: 'Set user_input = "abc". Try to convert it with int(). Catch the ValueError and print "Invalid number!".',
      starterCode: 'user_input = "abc"\n# Write try/except\n',
      solution: 'user_input = "abc"\ntry:\n    number = int(user_input)\n    print(number)\nexcept ValueError:\n    print("Invalid number!")',
      validator: (code) => {
        const hasTry = /try\s*:/i.test(code);
        const hasExcept = /except\s+ValueError\s*:/i.test(code);
        const hasInt = /int\s*\(\s*user_input\s*\)/i.test(code);
        const pass = hasTry && hasExcept && hasInt;
        return { pass, message: pass ? "Exception handled!" : "Need try: int(user_input) and except ValueError:." };
      },
      hint: "Use try: ... except ValueError: ... to catch invalid number conversions.",
    },
    {
      id: "py-11",
      title: "List Comprehensions",
      description: "List comprehensions create a new list by applying an expression to each item — all in one line.",
      difficulty: "advanced",
      instruction: "Use a list comprehension to create squares containing the square of each number from 1 to 10.",
      starterCode: "# Create squares using list comprehension\n",
      solution: "squares = [x ** 2 for x in range(1, 11)]\nprint(squares)",
      validator: (code) => {
        const hasComp = /\[.+for\s+\w+\s+in\s+range/i.test(code);
        const hasSquares = /squares\s*=/i.test(code);
        const pass = hasComp && hasSquares;
        return { pass, message: pass ? "List comprehension works!" : "Need squares = [x ** 2 for x in range(1, 11)]." };
      },
      hint: "Format: [expression for variable in iterable] — e.g. [x**2 for x in range(1, 11)].",
    },
    {
      id: "py-12",
      title: "Lambda Functions",
      description: "lambda creates a small, anonymous function in one line: lambda params: expression.",
      difficulty: "advanced",
      instruction: "Create a lambda function double that takes a number and returns it × 2. Call it with 5 and print the result.",
      starterCode: "# Create a lambda function\n",
      solution: "double = lambda x: x * 2\nprint(double(5))",
      validator: (code) => {
        const hasLambda = /double\s*=\s*lambda\s+\w+\s*:/i.test(code);
        const hasPrint = /print\s*\(\s*double\s*\(/i.test(code);
        const pass = hasLambda && hasPrint;
        return { pass, message: pass ? "Lambda works!" : "Need double = lambda x: x * 2 and print(double(5))." };
      },
      hint: "double = lambda x: x * 2. Call it like a regular function: double(5).",
    },
    {
      id: "py-13",
      title: "Map & Filter",
      description: "map() applies a function to every item. filter() keeps only items that pass a test.",
      difficulty: "advanced",
      instruction: "Use map() to double all items in numbers = [1,2,3,4,5]. Use filter() to keep only even numbers. Print both.",
      starterCode: "numbers = [1, 2, 3, 4, 5]\n# Use map and filter\n",
      solution: "numbers = [1, 2, 3, 4, 5]\ndoubled = list(map(lambda x: x * 2, numbers))\nevens = list(filter(lambda x: x % 2 == 0, numbers))\nprint(doubled)\nprint(evens)",
      validator: (code) => {
        const hasMap = /map\s*\(/i.test(code);
        const hasFilter = /filter\s*\(/i.test(code);
        const pass = hasMap && hasFilter;
        return { pass, message: pass ? "Map and filter used!" : "Need map(..., numbers) and filter(..., numbers)." };
      },
      hint: "map(function, list) and filter(function, list). Wrap in list() to print results.",
    },
    {
      id: "py-14",
      title: "Classes & OOP",
      description: "Classes are blueprints for objects. __init__ is the constructor; self refers to the instance.",
      difficulty: "advanced",
      instruction: 'Create a Student class with __init__(self, name, age) and a greet() method returning f"Hi, I am {self.name}".',
      starterCode: "# Create a Student class\n",
      solution: 'class Student:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def greet(self):\n        return f"Hi, I am {self.name}"',
      validator: (code) => {
        const hasClass = /class\s+Student\s*:/i.test(code);
        const hasInit = /def\s+__init__\s*\(\s*self/i.test(code);
        const hasGreet = /def\s+greet\s*\(\s*self\s*\)\s*:/i.test(code);
        return { pass: hasClass && hasInit && hasGreet, message: hasClass && hasInit && hasGreet ? "Class created!" : "Need class Student: with __init__ and greet methods." };
      },
      hint: "Python classes use self: class Student: def __init__(self, name, age):",
    },
    {
      id: "py-15",
      title: "Modules & Import",
      description: "Python modules are files of reusable code. Import built-in modules with the import statement.",
      difficulty: "advanced",
      instruction: "Import the math module. Print math.sqrt(144) and math.pi.",
      starterCode: "# Import the math module\n",
      solution: "import math\nprint(math.sqrt(144))\nprint(math.pi)",
      validator: (code) => {
        const hasImport = /import\s+math/i.test(code);
        const hasSqrt = /math\.sqrt\s*\(/i.test(code);
        const hasPi = /math\.pi/i.test(code);
        const pass = hasImport && hasSqrt && hasPi;
        return { pass, message: pass ? "Module imported!" : "Need import math, math.sqrt(144), and math.pi." };
      },
      hint: "import math at the top. Then use math.sqrt(144) and math.pi.",
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

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

function LessonMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold text-text mt-6 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold text-text mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-text-2 mt-4 mb-1">{line.slice(5)}</h4>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="border-border my-4" />);
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(<p key={i} className="text-sm text-text mb-1 pl-4">{renderInline(line)}</p>);
    } else if (line.startsWith("- ")) {
      elements.push(<p key={i} className="text-sm text-text mb-1 pl-4">• {renderInline(line.slice(2))}</p>);
    } else if (line.trim()) {
      elements.push(<p key={i} className="text-sm text-text mb-2">{renderInline(line)}</p>);
    }
  }

  return <>{elements}</>;
}
