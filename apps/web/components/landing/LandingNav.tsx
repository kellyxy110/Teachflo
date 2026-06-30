"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Calculator as CalcIcon, Menu, X } from "lucide-react";
import { Calculator } from "./Calculator";

export function LandingNav() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "transparent" }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: bgOpacity,
            background: "rgba(4,8,26,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo variant="light" size="md" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "#why", label: "Why Us" },
              { href: "#features", label: "Features" },
              { href: "#curriculum", label: "Curriculum" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
              { href: "/dashboard", label: "Dashboard", external: true },
            ].map(({ href, label, external }) =>
              external ? (
                <Link
                  key={label}
                  href={href}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ color: "#94a3b8" }}
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ color: "#94a3b8" }}
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {label}
                </a>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Calculator trigger */}
            <button
              onClick={() => setCalcOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <CalcIcon size={14} />
              Calculator
            </button>

            <Link
              href="/sign-in"
              className="hidden md:inline-block px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ color: "#94a3b8" }}
            >
              Sign in
            </Link>
            <Link
              href="/student-onboarding"
              className="hidden md:inline-block px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ color: "#10b981" }}
            >
              Student
            </Link>
            <Link
              href="/sign-up"
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(59,130,246,0.3)",
              }}
            >
              Get started free
            </Link>

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 rounded-xl"
              style={{ color: "#94a3b8" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 left-0 right-0 md:hidden"
            style={{ background: "rgba(4,8,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}
          >
            <div className="px-6 py-4 space-y-3">
              {[
                { href: "#why", label: "Why TeachNexis" },
                { href: "#features", label: "Features" },
                { href: "#curriculum", label: "Curriculum" },
                { href: "#pricing", label: "Pricing" },
                { href: "#faq", label: "FAQ" },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="block text-sm"
                  style={{ color: "#94a3b8" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileOpen(false);
                    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {label}
                </a>
              ))}
              <Link href="/sign-in" className="block text-sm" style={{ color: "#94a3b8" }}>Sign in</Link>
              <Link href="/sign-up" className="block text-sm font-bold" style={{ color: "#60a5fa" }}>Get started free →</Link>
              <button onClick={() => { setCalcOpen(true); setMobileOpen(false); }} className="block text-sm" style={{ color: "#94a3b8" }}>
                <CalcIcon size={14} className="inline mr-2" />Open Calculator
              </button>
            </div>
          </motion.div>
        )}
      </motion.nav>

      <Calculator open={calcOpen} onClose={() => setCalcOpen(false)} />
    </>
  );
}
