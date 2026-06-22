# TeachFlow OS — Frequently Asked Questions

---

## General

### What is TeachFlow OS?

TeachFlow OS is an AI-powered educational platform built specifically for Nigerian secondary schools. It helps teachers generate lesson plans, create exams, track student performance, and provide personalized AI tutoring — all aligned with WAEC, JAMB, and JUPEB curriculum standards.

### Who is TeachFlow for?

- **Teachers** who want to save time on lesson planning, exam creation, and grading
- **Students** (JSS1 through SS3) who want personalized study support and practice tools
- **School administrators** who need school-wide analytics and curriculum planning

### What class levels does it cover?

JSS1, JSS2, JSS3, SS1, SS2, and SS3 — the full Nigerian secondary school range.

### What exam boards does it align with?

- **WAEC** — West African Examinations Council
- **JAMB** — Joint Admissions and Matriculation Board
- **JUPEB** — Joint Universities Preliminary Examinations Board

### Is TeachFlow free to use?

Yes. The platform uses free-tier AI models from Groq and OpenRouter. There are no subscription fees for the core features.

### What subjects does it support?

All major Nigerian secondary school subjects including Mathematics, English, Biology, Chemistry, Physics, Economics, Government, and more. The AI can generate content for any subject in the Nigerian curriculum.

---

## AI Features

### How does the AI lesson generator work?

You provide a subject, class level, and topic. The AI generates a complete lesson plan with learning objectives, introduction, content, activities, evaluation questions, and homework — typically in under 10 seconds. You can then rewrite it for different exam standards (WAEC, JAMB, JUPEB, or simplified ELI12 mode).

### What AI models does TeachFlow use?

TeachFlow uses 7 different AI models, each chosen for what it does best:

| Task | Model |
|------|-------|
| Real-time tutoring | Llama 3.3 70B (via Groq) |
| Exam generation | DeepSeek V4 Flash |
| Curriculum planning | Qwen3 80B |
| Document analysis | Gemma 4 31B |
| Automation | Kimi K2.6 |
| Complex reasoning | Hermes 3 405B |
| General education | Llama 3.3 70B |

All models are on free tiers — no OpenAI or paid APIs are used.

### Does TeachFlow use OpenAI/ChatGPT?

No. TeachFlow deliberately avoids OpenAI APIs. All AI features use open-source models through Groq (for speed) and OpenRouter (for model variety), all on free tiers.

### How does Study Buddy differ from ChatGPT?

Study Buddy is not a general chatbot. It:
- Knows each student's skill map, weak areas, and recent mistakes
- Has 5 specialized learning modes (Explain, Test Me, Hint, Step-by-Step, Review Mistakes)
- Injects student context into every AI response
- Adapts its approach based on the selected mode
- Can retrieve information from uploaded school documents (RAG)

### What is RAG?

RAG (Retrieval-Augmented Generation) means the AI can search through uploaded school documents before answering. When you ask a question, the system finds the most relevant passages from your uploaded PDFs and gives them to the AI as context, so answers are grounded in your actual materials.

### How accurate are the AI-generated exams?

The AI generates exam questions aligned to Nigerian curriculum standards with:
- Correct answers verified through structured JSON output
- Distractor analysis explaining why wrong options are plausible
- Bloom's Taxonomy tagging for cognitive level
- Curriculum references linking each question to specific objectives

Teachers should always review generated content before distributing to students.

---

## Exams & Assessment

### What's the difference between Exam v1 and v2?

**v1 (Standard):** Generates a fixed exam paper with MCQs and theory questions. Good for creating exam papers to print and distribute.

**v2 (Adaptive):** An intelligent assessment engine that adapts in real-time. It has 4 modes (Standard, Diagnostic, Practice, Assessment), adjusts difficulty based on student responses, and detects misconceptions. Good for digital assessment and personalized testing.

### What question types are supported?

- Multiple Choice (MCQ) — 5 options (A–E)
- Short Answer — brief written responses
- Essay — extended written responses
- Structured — multi-part questions with sub-questions
- Calculation — numeric answers with working shown

### How does auto-grading work?

MCQ questions are auto-graded immediately when submitted. Theory and essay questions require manual grading. Each question response is tracked with:
- Selected option and text response
- Whether the answer is correct
- Time spent on the question
- Detected misconceptions

### What grading scale is used?

The Nigerian secondary school standard:
- **A: 70–100** (Excellent)
- **B: 60–69** (Very Good)
- **C: 50–59** (Good)
- **D: 45–49** (Fair)
- **E: 40–44** (Poor)
- **F: 0–39** (Fail)

---

## Knowledge Studio

### What file types can I upload?

Currently, the Knowledge Studio supports **PDF files**. The system extracts text, splits it into semantic chunks, and generates vector embeddings for retrieval.

### What can I generate from uploaded documents?

- **Summaries** — key points and overviews
- **Concepts** — extracted concepts with definitions and relationships
- **Flashcards** — Q&A review cards
- **Exam Questions** — MCQs and theory questions based on the document
- You can also **chat with the document** — ask questions and get answers grounded in the content

### How does document search work?

When you upload a PDF, it's split into chunks and each chunk gets a vector embedding (a mathematical representation of its meaning). When you search or ask a question, the system compares your query's embedding against all chunks to find the most relevant passages. This is called semantic search — it understands meaning, not just keywords.

---

## Calculator & Practice Games

### Do students need to log in to use the calculator?

No. The Scientific Calculator is accessible from the landing page navigation bar without any login. Students can use all 5 tabs (Standard, Equations, Statistics, Vectors, Graph) freely.

### Do students need to log in for practice games?

No. The Practice Arena games (Math Sprint, Concept Match, Fix the Answer, Quiz Battle) are available on the landing page under the "Explore" tab without authentication.

### What topics do the practice games cover?

- **Math Sprint** — basic arithmetic (addition, subtraction, multiplication, division)
- **Concept Match** — Biology, Chemistry, Physics concepts (osmosis, photosynthesis, Newton's laws, etc.)
- **Fix the Answer** — Algebra, Physics (speed), Geometry (area)
- **Quiz Battle** — Biology (liver function), Chemistry (water formula), Biology (photosynthesis)

---

## School Management

### How do I set up my school?

During onboarding (first sign-up), you'll enter:
1. School name
2. State (all 36 Nigerian states + FCT available)
3. Local Government Area (LGA)

This creates your school record. You can update these details later in Settings.

### How are students organized?

Students are enrolled in classes. Each class has:
- A **level** (JSS1 through SS3)
- An **arm** (A, B, C, etc.)
- A **term** (First, Second, or Third)
- A **session** (e.g., 2025/2026)

### How do I enter scores?

Go to **Scores** and select a class and subject. Enter CA1, CA2, and Exam scores for each student. The system automatically:
- Calculates the total (CA1 + CA2 + Exam)
- Assigns the grade based on the Nigerian A–F scale
- Updates the student's analytics

### What does "at-risk" mean?

A student is flagged as "at-risk" if they score below 50 (grade D, E, or F) in one or more subjects. The analytics dashboard shows the count of at-risk students so teachers and administrators can intervene early.

---

## Intelligence & Analytics

### What is the Intelligence Core?

The Intelligence Core is a set of three interconnected engines:

1. **Mistake Intelligence** — tracks error patterns across students, identifies root causes and prerequisite gaps
2. **Adaptive Learning Paths** — generates personalized step-by-step learning plans for each student
3. **Curriculum Generator** — creates term-long weekly teaching plans with assessment schedules

### How does mistake tracking work?

Every time a student answers a question incorrectly, the system:
1. Records the error with the relevant skill
2. Classifies the error type (computation, misconception, careless, etc.)
3. Looks for patterns across multiple errors
4. Identifies root causes and prerequisite gaps
5. Feeds this data to Study Buddy's "Review Mistakes" mode

### What analytics are available?

- **School average** across all subjects
- **Pass rate** (percentage scoring 50+)
- **Grade distribution** (A through F breakdown)
- **Subject performance** (per-subject averages)
- **Class statistics** (per-class averages and pass rates)
- **At-risk student count** with identification

---

## Technical

### What happens if the database can't connect?

If you see "This page couldn't load" errors, the most common cause is a database connection issue. For Vercel deployments, make sure you're using the Supabase **connection pooler** URL (port 6543), not the direct connection (port 5432). Direct connections use IPv6 which Vercel serverless functions cannot reach.

### Why do I need a connection pooler for Vercel?

Vercel serverless functions create a new connection for each request. Without a connection pooler, this can quickly exhaust PostgreSQL's connection limit. The Supabase Supavisor pooler (port 6543) manages connections efficiently and provides IPv4 connectivity.

### What if the AI returns errors?

All AI providers have rate limits on free tiers. If you hit a limit:
- The system automatically falls back to alternative models
- Wait a few minutes and try again
- Groq's free tier allows ~30 requests/minute
- OpenRouter's free tier varies by model

### Can I self-host TeachFlow?

Yes. You need:
- A PostgreSQL database with pgvector extension
- A Clerk account for authentication
- API keys for Groq and/or OpenRouter
- A hosting platform that supports Next.js (Vercel, Railway, etc.)

See the Getting Started section in README.md for setup instructions.

### What browsers are supported?

TeachFlow works in all modern browsers:
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

The calculator, graphs, and animations require JavaScript enabled.

---

## Troubleshooting

### "This page couldn't load" on the dashboard

**Cause:** Database connection failure (PrismaClientInitializationError)

**Fix:** Ensure your `DATABASE_URL` uses the Supabase pooler URL format:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

### Sign-in redirects to a blank page

**Cause:** Missing or invalid Clerk environment variables

**Fix:** Verify these are set in your environment:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
- `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`

### AI features return "Error" or don't respond

**Possible causes:**
1. Missing API keys (`GROQ_API_KEY` or `OPENROUTER_API_KEY`)
2. Rate limit hit on free tier — wait 1–2 minutes
3. Model temporarily unavailable — the system will fall back automatically

### Calculator shows "Error" for an expression

The calculator evaluates expressions using standard math rules. Common issues:
- Missing closing parentheses
- Invalid function arguments (e.g., `log(-1)`)
- Overflow for very large numbers (factorial of numbers above 170)

### Supabase project is paused

Free-tier Supabase projects auto-pause after 7 days of inactivity. To fix:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Restore** to unpause
4. Wait 1–2 minutes for the database to become available

---

## Contact & Support

For issues and feature requests, contact the development team.
