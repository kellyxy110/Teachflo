"use client";
import { useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { LearningModesSection } from "./LearningModesSection";
import { EducationalTickers } from "./EducationalTickers";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";

export function LandingPageClient() {
  useEffect(() => {
    let lenis: import("lenis").default | null = null;
    let observer: IntersectionObserver | null = null;

    (async () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!prefersReduced) {
        // Lenis smooth scroll — skip entirely for reduced-motion users
        const { default: Lenis } = await import("lenis");
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5,
        });

        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // Scroll-reveal for elements with .reveal class
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add("visible");
          });
        },
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
      {/* Fixed navigation */}
      <LandingNav />

      {/* 1 — Hero: Three.js + single H1 + two CTAs */}
      <HeroSection />

      {/* 2 — Educational ticker: lightweight, non-blocking */}
      <EducationalTickers />

      {/* 3 — Learning Modes: Learn / Practice / Explore tab system */}
      <LearningModesSection />

      {/* 4 — Footer: kellyxyhub + nav links */}
      <LandingFooter />
    </div>
  );
}
