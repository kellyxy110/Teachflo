import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "TeachFlow OS privacy policy — how we handle student and school data.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/" className="text-sm text-primary mb-8 inline-block hover:underline">
        &larr; Back to TeachFlow OS
      </Link>
      <h1 className="text-3xl font-bold text-text mb-6">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none text-text-2 space-y-4 text-sm leading-relaxed">
        <p>Last updated: June 2026</p>
        <h2 className="text-lg font-semibold text-text mt-8">What We Collect</h2>
        <p>TeachFlow OS collects teacher profiles, student records, class information, exam responses, and learning analytics necessary to deliver the educational service.</p>
        <h2 className="text-lg font-semibold text-text mt-8">How We Use Data</h2>
        <p>Data is used to generate personalised lesson plans, adaptive exams, learning paths, and mistake analysis. AI models process educational content to improve learning outcomes.</p>
        <h2 className="text-lg font-semibold text-text mt-8">Data Storage</h2>
        <p>All data is stored securely using Supabase (PostgreSQL) with encryption at rest and in transit. Authentication is handled by Clerk with industry-standard security.</p>
        <h2 className="text-lg font-semibold text-text mt-8">Third-Party AI Models</h2>
        <p>Educational prompts are sent to AI providers (Groq, OpenRouter) for content generation. No student personal information is included in AI requests.</p>
        <h2 className="text-lg font-semibold text-text mt-8">Data Retention</h2>
        <p>School and student data is retained for the duration of the account. Teachers can request data deletion by contacting kellyxy110@gmail.com.</p>
        <h2 className="text-lg font-semibold text-text mt-8">Children&apos;s Privacy</h2>
        <p>TeachFlow OS is used by schools under teacher supervision. Student data is managed by teachers and school administrators, not collected directly from minors.</p>
      </div>
    </main>
  );
}
