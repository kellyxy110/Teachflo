import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://teachflow-os.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TeachFlow OS — AI Learning for Nigerian Schools",
    template: "%s | TeachFlow OS",
  },
  description:
    "AI-powered learning OS for Nigerian secondary schools (JSS1–SS3). Generate WAEC-ready lesson plans, build exam questions with distractor analysis, track student skills, and practise with AI Study Buddy. Powered by 7 free AI models.",
  keywords: [
    "WAEC", "JAMB", "JUPEB", "Nigerian schools", "AI education",
    "lesson planner", "JSS1", "SS3", "secondary school", "study buddy",
    "TeachFlow", "AI tutor Nigeria", "exam generator", "adaptive learning",
  ],
  openGraph: {
    title: "TeachFlow OS — AI Learning for Nigerian Schools",
    description:
      "Generate WAEC lessons in 10 seconds, build exams with distractor analysis, track every student's skill graph. Free forever plan.",
    type: "website",
    url: SITE_URL,
    siteName: "TeachFlow OS",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "TeachFlow OS — AI Learning for Nigerian Schools",
    description:
      "Generate WAEC lessons in 10 seconds. Free AI study tools for JSS1–SS3.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isValidKey =
    typeof publishableKey === "string" &&
    (publishableKey.startsWith("pk_test_") ||
      publishableKey.startsWith("pk_live_"));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TeachFlow OS",
    url: SITE_URL,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "AI-powered learning OS for Nigerian secondary schools. Generate WAEC-ready lesson plans, build adaptive exams, track student skills, and study with an AI tutor. Covers JSS1 to SS3, aligned with WAEC, JAMB, and JUPEB curricula.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "NGN",
      description: "Free forever plan with 18 AI models",
    },
    author: {
      "@type": "Organization",
      name: "KellyxyHub",
      url: "https://kellyxy.vercel.app",
      founder: {
        "@type": "Person",
        name: "Ekeleme Kelechi David",
        url: "https://kellyxy.vercel.app",
      },
    },
    audience: {
      "@type": "EducationalAudience",
      educationalRole: ["teacher", "student"],
      audienceType: "Nigerian secondary school teachers and students (JSS1–SS3)",
    },
    featureList: [
      "AI lesson plan generator (WAEC, JAMB, JUPEB modes)",
      "Adaptive exam engine with misconception detection",
      "AI Study Buddy with 5 learning modes",
      "Student skill graph and analytics",
      "Mistake intelligence and learning path engine",
      "RAG-powered curriculum generator",
      "18 free AI models with smart routing",
      "Code Lab — interactive coding practice (HTML, CSS, JS, Python)",
    ],
  };

  const inner = (
    <html lang="en-NG" className={inter.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tf-theme");var d=window.matchMedia("(prefers-color-scheme:dark)").matches;if(t==="dark"||(!t&&d))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-bg antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );

  if (!isValidKey) return inner;

  return <ClerkProvider publishableKey={publishableKey!}>{inner}</ClerkProvider>;
}
