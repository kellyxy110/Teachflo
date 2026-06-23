"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

const IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&h=400&fit=crop&q=80",
    alt: "Students studying together in a modern classroom",
    label: "Collaborative Learning",
  },
  {
    src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&q=80",
    alt: "Student writing an exam in a well-lit hall",
    label: "Exam Preparation",
  },
  {
    src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop&q=80",
    alt: "Teacher explaining concepts at a modern whiteboard",
    label: "Interactive Teaching",
  },
  {
    src: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop&q=80",
    alt: "Students using laptops for digital learning",
    label: "Digital Classrooms",
  },
  {
    src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&h=400&fit=crop&q=80",
    alt: "Students celebrating academic achievement",
    label: "Academic Excellence",
  },
  {
    src: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=400&fit=crop&q=80",
    alt: "Student reading in a school library",
    label: "Independent Study",
  },
];

export function SchoolShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = IMAGES.length;

  const next = useCallback(() => setActive((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [paused, next]);

  function getStyle(index: number) {
    let offset = index - active;
    if (offset > count / 2) offset -= count;
    if (offset < -count / 2) offset += count;

    const absOffset = Math.abs(offset);
    const isCenter = offset === 0;

    const translateX = offset * 260;
    const translateZ = isCenter ? 0 : -150 - absOffset * 60;
    const rotateY = offset * -35;
    const scale = isCenter ? 1 : Math.max(0.55, 0.85 - absOffset * 0.1);
    const opacity = absOffset > 2 ? 0 : isCenter ? 1 : Math.max(0.3, 0.7 - absOffset * 0.15);
    const zIndex = 100 - absOffset * 10;

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      pointerEvents: (absOffset > 2 ? "none" : "auto") as React.CSSProperties["pointerEvents"],
    };
  }

  return (
    <section className="py-20 px-6 overflow-hidden" style={{ background: "#04081a" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.3em] mb-3"
            style={{ color: "#475569" }}
          >
            Modern Education
          </p>
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#f1f5f9" }}>
            Built for <span className="gradient-text">real classrooms</span>
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "#64748b" }}>
            TeachFlow powers modern Nigerian schools — from collaborative study sessions to WAEC exam halls.
          </p>
        </motion.div>

        {/* Coverflow container */}
        <div
          className="relative mx-auto"
          style={{ perspective: "1200px", height: 340 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {IMAGES.map(({ src, alt, label }, i) => (
              <div
                key={label}
                className="absolute cursor-pointer"
                style={{
                  ...getStyle(i),
                  width: 380,
                  height: 260,
                  transformStyle: "preserve-3d",
                }}
                onClick={() => setActive(i)}
              >
                <div
                  className="relative w-full h-full rounded-2xl overflow-hidden"
                  style={{
                    border: i === active
                      ? "2px solid rgba(59,130,246,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: i === active
                      ? "0 20px 60px rgba(59,130,246,0.25), 0 0 40px rgba(59,130,246,0.1)"
                      : "0 10px 30px rgba(0,0,0,0.4)",
                  }}
                >
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="380px"
                    className="object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: i === active
                        ? "linear-gradient(to top, rgba(4,8,26,0.7) 0%, transparent 50%)"
                        : "linear-gradient(to top, rgba(4,8,26,0.85) 0%, rgba(4,8,26,0.3) 50%, rgba(4,8,26,0.1) 100%)",
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: i === active ? "#93c5fd" : "#64748b" }}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                {/* Reflection */}
                {i === active && (
                  <div
                    className="absolute top-full left-0 w-full rounded-2xl overflow-hidden"
                    style={{
                      height: 80,
                      transform: "scaleY(-1)",
                      maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)",
                      WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)",
                      pointerEvents: "none",
                    }}
                  >
                    <Image src={src} alt="" fill sizes="380px" className="object-cover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={prev}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-colors"
            aria-label="Previous"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex gap-2">
            {IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                className="transition-all"
                style={{
                  width: i === active ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === active ? "#3b82f6" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-colors"
            aria-label="Next"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
