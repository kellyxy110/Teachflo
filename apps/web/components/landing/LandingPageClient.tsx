"use client";
import { useEffect } from "react";
import { LandingNav } from "./LandingNav";
import { HeroSection } from "./HeroSection";
import { WhyTeachNexisSection } from "./WhyTeachNexisSection";
import { VideoShowcaseSection } from "./VideoShowcaseSection";
import { IntelligenceLayerSection } from "./IntelligenceLayerSection";
import { DashboardShowcaseSection } from "./DashboardShowcaseSection";
import { StatsSection } from "./StatsSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { PricingSection } from "./PricingSection";
import { FAQSection } from "./FAQSection";
import { FinalCTASection } from "./FinalCTASection";
import { LandingFooter } from "./LandingFooter";

export function LandingPageClient() {
  useEffect(() => {
    let lenis: import("lenis").default | null = null;
    let observer: IntersectionObserver | null = null;

    (async () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!prefersReduced) {
        const { default: Lenis } = await import("lenis");
        lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5,
        });

        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);

        // Subtle scroll-fade for each .landing-section
        const sections = document.querySelectorAll(".landing-section");
        sections.forEach((section) => {
          gsap.fromTo(
            section,
            { opacity: 0.7, y: 24 },
            {
              opacity: 1, y: 0, duration: 0.8, ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
      }

      // Scroll-reveal for .reveal elements
      observer = new IntersectionObserver(
        (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }); },
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      );
      document.querySelectorAll(".reveal").forEach((el) => observer?.observe(el));
    })();

    return () => {
      lenis?.destroy();
      observer?.disconnect();
    };
  }, []);

  return (
    <div style={{ fontFamily: "inherit" }}>
      <LandingNav />

      {/* 1 — Hero */}
      <HeroSection />

      {/* 2 — Why TeachNexis / Feature overview */}
      <WhyTeachNexisSection />

      {/* 3 — Live product demo / animated showcase */}
      <VideoShowcaseSection />

      {/* 4 — Intelligence Layer (12 AI capabilities) */}
      <IntelligenceLayerSection />

      {/* 5 — Dashboard showcase (Teacher / Principal / Student / Parent) */}
      <DashboardShowcaseSection />

      {/* 6 — Stats */}
      <StatsSection />

      {/* 7 — Testimonials */}
      <TestimonialsSection />

      {/* 8 — Pricing */}
      <PricingSection />

      {/* 9 — FAQ */}
      <FAQSection />

      {/* 10 — Final CTA */}
      <FinalCTASection />

      {/* 11 — Footer */}
      <LandingFooter />
    </div>
  );
}
