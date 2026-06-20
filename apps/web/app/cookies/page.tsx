import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "TeachFlow OS cookie policy — what cookies we use and why.",
};

export default function CookiesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/" className="text-sm text-primary mb-8 inline-block hover:underline">
        &larr; Back to TeachFlow OS
      </Link>
      <h1 className="text-3xl font-bold text-text mb-6">Cookie Policy</h1>
      <div className="prose prose-slate max-w-none text-text-2 space-y-4 text-sm leading-relaxed">
        <p>Last updated: June 2026</p>
        <h2 className="text-lg font-semibold text-text mt-8">Essential Cookies</h2>
        <p>TeachFlow OS uses essential cookies for authentication (Clerk session cookies) and security. These are required for the application to function and cannot be disabled.</p>
        <h2 className="text-lg font-semibold text-text mt-8">Analytics</h2>
        <p>We do not use third-party analytics cookies. No tracking pixels or advertising cookies are used.</p>
        <h2 className="text-lg font-semibold text-text mt-8">Contact</h2>
        <p>For questions about our cookie usage, contact judithluchi@gmail.com.</p>
      </div>
    </main>
  );
}
