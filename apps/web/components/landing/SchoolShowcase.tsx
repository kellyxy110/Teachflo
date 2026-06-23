"use client";
import Image from "next/image";
import { motion } from "framer-motion";

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
  return (
    <section className="py-20 px-6" style={{ background: "#04081a" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {IMAGES.map(({ src, alt, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                aspectRatio: i === 0 || i === 5 ? "3/4" : "3/2",
              }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(4,8,26,0.85) 0%, rgba(4,8,26,0.2) 50%, transparent 100%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#93c5fd" }}
                >
                  {label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
