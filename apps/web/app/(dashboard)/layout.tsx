import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  // Skip teacher check for onboarding page
  return (
    <ThemeProvider>
      <div className="flex h-screen bg-bg transition-colors duration-200">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-56 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
