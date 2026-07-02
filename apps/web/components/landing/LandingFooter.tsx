"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Github, Twitter, Mail, ExternalLink, Zap } from "lucide-react";

const NAV_LINKS = {
  Platform: [
    { href: "/sign-up", label: "Get Started Free" },
    { href: "/sign-in", label: "Sign In" },
    { href: "#why", label: "Why TeachNexis", scroll: true },
    { href: "#features", label: "Features", scroll: true },
    { href: "#curriculum", label: "Curriculum Graph", scroll: true },
    { href: "#pricing", label: "Pricing", scroll: true },
    { href: "#faq", label: "FAQ", scroll: true },
  ],
  Tools: [
    { href: "/sign-up", label: "AI Lesson Generator" },
    { href: "/sign-up", label: "CIG Exam Builder" },
    { href: "/sign-up", label: "AI Study Buddy" },
    { href: "/sign-up", label: "Coding Lab" },
    { href: "/sign-up", label: "Curriculum Browser" },
    { href: "/sign-up", label: "Report Cards" },
  ],
  Legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
} as const;

export function LandingFooter() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!sectionRef.current) return;
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8,
          scrollTrigger: { trigger: sectionRef.current, start: "top 85%" },
        }
      );
    })();
  }, []);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      ref={sectionRef}
      style={{
        background: "linear-gradient(180deg, #0c1a3e, #07102b)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* CTA Banner */}
      <div
        className="mx-6 mt-16 mb-16 rounded-3xl p-10 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(217,119,6,0.12), rgba(37,99,235,0.12))",
          border: "1px solid rgba(217,119,6,0.25)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(217,119,6,0.06), transparent 70%)" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10"
        >
          <h2 className="text-3xl font-black mb-3" style={{ color: "#f1f5f9" }}>
            Ready to teach smarter?
          </h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: "#94a3b8" }}>
            Join Nigerian teachers and students using TeachNexis to generate lessons, build exams, and prepare for WAEC, JAMB, and JUPEB — free forever.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/sign-up"
              className="px-8 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #d97706, #2563eb)", boxShadow: "0 0 40px rgba(217,119,6,0.3)" }}
            >
              Start for free →
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Main footer */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <div className="mb-3">
              <Logo variant="light" size="md" />
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: "#475569" }}>
              AI-powered learning operating system for Nigerian secondary schools. JSS1 to SS3. WAEC, JAMB, JUPEB aligned.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Github, href: "https://github.com/kellyxy110/Teachflo", label: "GitHub" },
                { icon: Twitter, href: "https://x.com/EkelemeKelechi1", label: "Twitter" },
                { icon: Mail, href: "mailto:kellyxy110@gmail.com", label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={label}
                  className="p-2.5 rounded-xl transition-all hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(NAV_LINKS).map(([section, links]) => (
            <div key={section}>
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-4" style={{ color: "#475569" }}>
                {section}
              </div>
              <ul className="space-y-2.5">
                {links.map((link) => {
                  const isScroll = "scroll" in link && link.scroll;
                  return (
                    <li key={link.label}>
                      {isScroll ? (
                        <a
                          href={link.href}
                          onClick={(e) => handleScroll(e, link.href.replace("#", ""))}
                          className="text-sm transition-all hover:opacity-80 cursor-pointer"
                          style={{ color: "#64748b" }}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm transition-all hover:opacity-80"
                          style={{ color: "#64748b" }}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="text-xs" style={{ color: "#334155" }}>
            © {new Date().getFullYear()} TeachNexis. All rights reserved.
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "#334155" }}>
            Built by{" "}
            <a
              href="https://kellyxy.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold transition-all hover:opacity-80 flex items-center gap-1"
              style={{ color: "#60a5fa" }}
            >
              KellyxyHub <ExternalLink size={10} />
            </a>
            {" · "}
            <span>Powered by 18 AI models</span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#334155" }}>
            <span className="flex items-center gap-1">
              <Zap size={12} style={{ color: "#f59e0b" }} />
              WAEC · JAMB · JUPEB aligned
            </span>
            <span className="hidden md:inline">·</span>
            <a
              href="https://sitenexis.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              style={{ color: "#475569" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 32 32" className="shrink-0">
                <rect width="32" height="32" rx="6" fill="#0A1628"/>
                <polygon points="16,3 29,10.5 24.5,26 7.5,26 3,10.5" fill="rgba(0,200,255,0.12)" stroke="#00C8FF" strokeWidth="1.5" strokeLinejoin="round"/>
                <polygon points="16,8.5 23.5,13 21,21.5 11,21.5 8.5,13" fill="rgba(11,206,188,0.2)" stroke="rgba(11,206,188,0.6)" strokeWidth="0.8" strokeLinejoin="round"/>
              </svg>
              Content quality verified by{" "}
              <span className="font-semibold" style={{ color: "#60a5fa" }}>SiteNexis</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
