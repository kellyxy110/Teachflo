import { redirect } from "next/navigation";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_KEY) {
    redirect("/setup");
  }

  try {
    const { safeAuth } = await import("@/lib/auth");
    const { userId, sessionClaims } = await safeAuth();
    if (userId) {
      const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
      if (meta?.role === "student") redirect("/s/dashboard");
      redirect("/dashboard");
    }
  } catch {
    // Not signed in — show landing page
  }

  return (
    <>
      {/* Server-rendered SEO content — visible to crawlers that don't run JS */}
      <div className="sr-only" aria-hidden="false">
        <h1>TeachNexis — AI Learning Operating System for Nigerian Schools</h1>
        <p>
          TeachNexis is a free AI-powered learning platform for Nigerian secondary schools,
          covering JSS1 to SS3. It is aligned with WAEC, JAMB, and JUPEB curricula and powered
          by 7 free AI models.
        </p>
        <h2>Features</h2>
        <ul>
          <li>AI Lesson Plan Generator — create WAEC-ready lesson plans in under 10 seconds, with ELI12, WAEC, JAMB, and JUPEB rewrite modes</li>
          <li>Adaptive Exam Engine — 4 exam modes (Standard, Diagnostic, Practice, Adaptive) with real-time difficulty adjustment, misconception detection, and distractor analysis</li>
          <li>AI Study Buddy — 5 learning modes: Explain, Test Me, Hint, Step-by-Step, and Review Mistakes. Adapts to each student&apos;s weak topics.</li>
          <li>Student Skill Graph and Analytics — track every student&apos;s performance across Bloom&apos;s Taxonomy levels, detect prerequisite gaps, and identify recurring mistake patterns</li>
          <li>Intelligence Core — self-improving education engine: Mistake Intelligence detects error patterns, Adaptive Learning generates personalised study paths, and the Curriculum Generator produces performance-aware term plans</li>
          <li>RAG Document Library — upload school PDFs and syllabi for AI-augmented question generation and context-aware tutoring</li>
          <li>Multi-Model AI Router — routes each task to the best free AI model: Groq for tutoring, DeepSeek for exams, Qwen for reasoning, Gemma for documents</li>
        </ul>
        <h2>Nigerian Grading Scale</h2>
        <p>A: 70–100, B: 60–69, C: 50–59, D: 45–49, E: 40–44, F: 0–39</p>
        <h2>Supported Exam Bodies</h2>
        <p>WAEC (West African Examinations Council), JAMB (Joint Admissions and Matriculation Board), JUPEB (Joint Universities Preliminary Examinations Board)</p>
        <h2>Class Levels</h2>
        <p>JSS1, JSS2, JSS3, SS1, SS2, SS3 — Nigerian secondary school from Junior Secondary to Senior Secondary</p>
      </div>

      {/* Interactive client landing page */}
      <LandingPageClient />
    </>
  );
}
