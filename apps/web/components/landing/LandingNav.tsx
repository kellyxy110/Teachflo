"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#workflow", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#dashboard", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "Resources" },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 60], [0, 1]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ background: "transparent" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: bgOpacity,
          background: "rgba(5,13,31,0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo variant="light" size="md" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={label}
              href={href}
              onClick={(e) => handleSmoothScroll(e, href)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 14,
                fontWeight: 500, color: "rgba(148,163,184,0.85)",
                transition: "color 0.15s",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(148,163,184,0.85)"; }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden md:inline-block px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: "rgba(148,163,184,0.8)" }}
          >
            Login
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(37,99,235,0.3)",
            }}
          >
            Get Started
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: "#94a3b8" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 left-0 right-0 md:hidden"
          style={{
            background: "rgba(5,13,31,0.97)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="px-6 py-5 space-y-3">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                onClick={(e) => handleSmoothScroll(e, href)}
                className="block text-sm font-medium"
                style={{ color: "#94a3b8", textDecoration: "none" }}
              >
                {label}
              </a>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
            <Link href="/sign-in" className="block text-sm" style={{ color: "#94a3b8", textDecoration: "none" }}>
              Login
            </Link>
            <Link
              href="/sign-up"
              className="block text-sm font-bold"
              style={{ color: "#60a5fa", textDecoration: "none" }}
            >
              Get Started Free →
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
