"use client";

import Link from "next/link";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";

export default function ChooseRolePage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="font-black text-2xl mb-2 text-text">
            Teach<span className="gradient-text">Nexis</span>
          </div>
          <h1 className="text-2xl font-black text-text mt-6 mb-2">Who are you?</h1>
          <p className="text-sm text-text-2">
            Choose your role to set up your account correctly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Teacher */}
          <Link
            href="/onboarding"
            className="group flex flex-col gap-4 p-6 bg-surface border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-text mb-1">I&apos;m a Teacher</h2>
              <p className="text-xs text-text-2 leading-relaxed">
                Create your school, generate lesson plans, build exams, and manage your classes.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-auto">
              Set up school <ArrowRight size={12} />
            </div>
          </Link>

          {/* Student */}
          <Link
            href="/student-onboarding"
            className="group flex flex-col gap-4 p-6 bg-surface border border-border rounded-2xl hover:border-green-500/50 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap size={24} className="text-green-500" />
            </div>
            <div>
              <h2 className="font-bold text-text mb-1">I&apos;m a Student</h2>
              <p className="text-xs text-text-2 leading-relaxed">
                Link your account using your school code and registration number from your teacher.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-green-600 mt-auto">
              Link student account <ArrowRight size={12} />
            </div>
          </Link>
        </div>

        <p className="text-center text-xs text-text-2 mt-6">
          Not sure which to pick?{" "}
          <a href="mailto:kellyxy110@gmail.com" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
