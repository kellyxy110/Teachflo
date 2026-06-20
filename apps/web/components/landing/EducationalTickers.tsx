"use client";
import { motion } from "framer-motion";

const QUOTES = [
  "Education is the most powerful weapon you can use to change the world — Nelson Mandela",
  "The beautiful thing about learning is that no one can take it away from you — B.B. King",
  "Intelligence plus character — that is the goal of true education — Martin Luther King Jr.",
  "An investment in knowledge pays the best interest — Benjamin Franklin",
  "The more that you read, the more things you will know — Dr. Seuss",
  "Education is not the filling of a pail, but the lighting of a fire — W.B. Yeats",
  "The roots of education are bitter, but the fruit is sweet — Aristotle",
  "Live as if you were to die tomorrow. Learn as if you were to live forever — Mahatma Gandhi",
  "Tell me and I forget. Teach me and I remember. Involve me and I learn — Benjamin Franklin",
  "The mind is not a vessel to be filled, but a fire to be kindled — Plutarch",
  "It is the mark of an educated mind to entertain a thought without accepting it — Aristotle",
  "Anyone who stops learning is old, whether at twenty or eighty — Henry Ford",
  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today — Malcolm X",
  "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice — Brian Herbert",
  "A person who never made a mistake never tried anything new — Albert Einstein",
  "Success is not final, failure is not fatal: it is the courage to continue that counts — Winston Churchill",
  "The only way to do great work is to love what you do — Steve Jobs",
  "Not everything that is faced can be changed, but nothing can be changed until it is faced — James Baldwin",
  "Children must be taught how to think, not what to think — Margaret Mead",
  "The function of education is to teach one to think intensively and to think critically — Martin Luther King Jr.",
  "I am not a teacher, but an awakener — Robert Frost",
  "Learning is not attained by chance, it must be sought for with ardour and diligence — Abigail Adams",
  "The expert in anything was once a beginner — Helen Hayes",
  "What we learn with pleasure we never forget — Alfred Mercier",
  "Knowledge is power. Information is liberating. Education is the premise of progress — Kofi Annan",
];

const FACTS = [
  "🔬 The human brain has about 86 billion neurons connected by trillions of synapses",
  "🌍 Nigeria has the largest education system in Sub-Saharan Africa with 40M+ students",
  "📐 The Pythagorean theorem (a²+b²=c²) was known 1000 years before Pythagoras",
  "⚡ Light travels 299,792,458 metres per second in a vacuum",
  "🧬 DNA stands for Deoxyribonucleic Acid — it encodes the genetic blueprint of all living organisms",
  "🌱 Photosynthesis converts light energy into glucose: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
  "🔢 The number Pi (π) has been calculated to over 100 trillion decimal places",
  "⚗️ The periodic table has 118 confirmed elements, arranged by atomic number",
  "🧮 Zero was invented by ancient Indian mathematicians — it revolutionised the entire number system",
  "🌊 About 71% of Earth's surface is covered by water, but only 2.5% is freshwater",
  "🧲 The Earth's magnetic field protects us from solar wind — it extends 65,000 km into space",
  "🔭 The nearest star to Earth after the Sun is Proxima Centauri — 4.24 light-years away",
  "🧪 Water (H₂O) is the only substance that naturally exists in all three states: solid, liquid, and gas",
  "🌡️ Absolute zero is −273.15°C — at this temperature, all atomic motion stops",
  "📊 The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13...) appears everywhere in nature, from sunflowers to hurricanes",
  "🔋 The average human body generates about 100 watts of power at rest — enough to light a bulb",
  "🏛️ The Great Wall of China is approximately 21,196 km long and took over 2,000 years to build",
  "🦠 A single teaspoon of soil contains more microorganisms than there are people on Earth",
  "💎 Diamond and graphite are both made of pure carbon — only the atomic arrangement differs",
  "🌋 There are about 1,500 potentially active volcanoes worldwide, with 50-70 erupting each year",
  "🧠 Your brain uses 20% of your body's total energy despite being only 2% of your body weight",
  "🌙 The Moon is slowly drifting away from Earth at a rate of about 3.8 cm per year",
  "🐋 The blue whale's heart is the size of a small car and beats only 8-10 times per minute when diving",
  "🎵 Sound travels about 4.3 times faster in water than in air — 1,480 m/s vs 343 m/s",
  "⚛️ An atom is 99.9999999% empty space — if an atom were the size of a stadium, the nucleus would be a pea",
  "🌐 Nigeria has over 500 languages, making it one of the most linguistically diverse countries on Earth",
  "📡 Radio waves travel at the speed of light — a signal reaches the Moon in about 1.3 seconds",
  "🔥 The Sun's core temperature is about 15 million degrees Celsius — hot enough to fuse hydrogen into helium",
  "🧊 Antarctica holds about 70% of the world's fresh water, locked in its ice sheet",
  "🎓 The University of al-Qarawiyyin in Morocco, founded in 859 AD, is the world's oldest existing university",
];

const TIPS = [
  "💡 Study Tip: Review material within 24 hours to boost long-term retention by up to 60%",
  "📚 Tip: Use the Pomodoro technique — 25 min focus, 5 min break, repeat 4 times, then take a long break",
  "✏️ Tip: Teach what you learned to someone else — the best way to confirm you understand it",
  "🧠 Tip: Spaced repetition beats cramming every time — review topics across multiple sessions",
  "🎯 Tip: Focus on weak topics first; your brain improves fastest where it struggles most",
  "💤 Tip: Sleep is when your brain consolidates memories — never sacrifice sleep for last-minute cramming",
  "📝 Tip: Write summaries in your own words — paraphrasing forces deeper understanding than copying",
  "🔗 Tip: Connect new information to things you already know — your brain stores memories in networks",
  "🎨 Tip: Use diagrams and mind maps for visual topics — many people remember images better than text",
  "⏰ Tip: Study your hardest subjects when your energy is highest — usually morning for most students",
  "🗂️ Tip: Break large topics into small chunks — your working memory can only hold 4-7 items at once",
  "🏃 Tip: Take a 10-minute walk between study sessions — exercise boosts memory and focus",
  "📖 Tip: Read the question twice before answering in exams — many marks are lost to misreading",
  "🔄 Tip: Practice past WAEC and JAMB questions — exam patterns repeat more often than you think",
  "✅ Tip: Start every study session with a clear goal — 'I will master quadratic equations today'",
  "🎧 Tip: If you listen to music while studying, choose instrumental tracks — lyrics compete with your reading",
  "🍎 Tip: Stay hydrated and eat well — your brain is 75% water and needs glucose to function",
  "📱 Tip: Put your phone in another room while studying — just seeing it reduces your focus by 20%",
  "🤝 Tip: Form study groups of 3-4 people — explaining concepts to each other strengthens everyone's understanding",
  "📋 Tip: Use active recall — close your notes and try to write down everything you remember, then check",
  "🌅 Tip: Review your notes right before sleeping — your brain processes and consolidates during sleep",
  "🔑 Tip: Highlight key terms sparingly — if everything is highlighted, nothing stands out",
  "📊 Tip: Track your study hours — what gets measured gets improved",
  "💪 Tip: Don't skip practice problems — reading the solution is not the same as solving it yourself",
  "🧩 Tip: Interleave your practice — mix different types of problems instead of doing 20 of the same kind",
];

function TickerRow({ items, speed, opacity, color }: { items: string[]; speed: number; opacity: number; color: string }) {
  return (
    <div className="overflow-hidden" style={{ opacity }}>
      <div
        className="ticker-track flex gap-8 whitespace-nowrap py-2"
        style={{ animationDuration: `${speed}s` }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-xs shrink-0"
            style={{ color }}
          >
            {item}
            <span className="mx-4" style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function EducationalTickers() {
  return (
    <div
      className="py-8 space-y-2 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, transparent, rgba(59,130,246,0.03), transparent)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <TickerRow items={QUOTES} speed={45} opacity={0.5} color="#60a5fa" />
      <TickerRow items={FACTS} speed={35} opacity={0.4} color="#a78bfa" />
      <TickerRow items={TIPS} speed={40} opacity={0.45} color="#34d399" />
    </div>
  );
}

// Floating motivational orb (persistent corner element)
export function FloatingQuote() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 3, duration: 0.8 }}
      className="fixed bottom-6 right-6 z-30 max-w-xs hidden xl:block"
    >
      <div
        className="rounded-2xl p-4 text-xs leading-relaxed"
        style={{
          background: "rgba(13,22,53,0.85)",
          border: "1px solid rgba(59,130,246,0.2)",
          backdropFilter: "blur(16px)",
          color: "#94a3b8",
          boxShadow: "0 0 30px rgba(59,130,246,0.1)",
        }}
      >
        <div className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>Daily Inspiration</div>
        {quote}
      </div>
    </motion.div>
  );
}
