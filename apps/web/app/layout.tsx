import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TeachFlow OS",
  description: "AI-powered school management for Nigerian secondary schools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const inner = (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-bg antialiased">{children}</body>
    </html>
  );

  if (!publishableKey) return inner;

  return <ClerkProvider publishableKey={publishableKey}>{inner}</ClerkProvider>;
}
