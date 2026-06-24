"use client";
import { useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { LearningModesSection } from "./LearningModesSection";
import { EducationalTickers } from "./EducationalTickers";
import { SchoolShowcase } from "./SchoolShowcase";
import { PioneerSection } from "./PioneerSection";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";

export function LandingPageClient() {
  useEffect(() => {
    let lenis: import("lenis").default | null = null;
    let observer: IntersectionObserver | null = null;

    (async () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (!prefersReduced) {
        // ── Lenis smooth scrolling ──────────────────────────────────────────
        const { default: Lenis } = await import("lenis");
        lenis = new Lenis({
          duration: 1.3,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5,
        });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);

        // ── Global section parallax: each major section fades/rises in ────
        const sections = document.querySelectorAll(".landing-section");
        sections.forEach((section) => {
          gsap.fromTo(
            section,
            { opacity: 0.6, y: 40 },
            {
              opacity: 1, y: 0, duration: 1, ease: "power2.out",
              scrollTrigger: { trigger: section, start: "top 85%", toggleActions: "play none none reverse" },
            }
          );
        });

        // ── Floating parallax for hero decorative elements ─────────────────
        gsap.to(".hero-parallax-slow", {
          y: -80, ease: "none",
          scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.to(".hero-parallax-fast", {
          y: -160, ease: "none",
          scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 2 },
        });

        // ── School Showcase parallax ───────────────────────────────────────
        const showcaseImages = document.querySelectorAll(".showcase-img");
        showcaseImages.forEach((img, i) => {
          gsap.to(img, {
            y: (i % 2 === 0 ? -40 : -20),
            ease: "none",
            scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: 1 + i * 0.3 },
          });
        });
      }

      // ── Intersection Observer scroll-reveal (.reveal elements) ────────────
      observer = new IntersectionObserver(
        (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }); },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );
      document.querySelectorAll(".reveal").forEach((el) => observer?.observe(el));
    })();

    return () => {
      lenis?.destroy();
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="landing">
      <LandingNav />

      {/* 1 — Hero */}
      <div id="hero">
        <HeroSection />
      </div>

      {/* 2 — Educational ticker */}
      <div className="landing-section">
        <EducationalTickers />
      </div>

      {/* 3 — Learning Modes */}
      <div className="landing-section" id="modes">
        <LearningModesSection />
      </div>

      {/* 4 — School Showcase */}
      <div className="landing-section">
        <SchoolShowcase />
      </div>

      {/* 5 — Pioneer / Beta Educator */}
      <PioneerSection />

      {/* 6 — Footer */}
      <LandingFooter />
    </div>
  );
}
