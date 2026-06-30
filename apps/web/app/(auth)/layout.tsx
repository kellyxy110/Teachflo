import { AuthNarrativePanel } from "./AuthNarrativePanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-bg">
      {/* Left — Narrative panel (hidden on mobile, shown on md+) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden">
        <AuthNarrativePanel />
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:px-8">
        <div className="w-full max-w-md">
          {/* Mobile-only header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl font-bold text-text">
              Teach<span className="gradient-text">Nexis</span>
            </h1>
            <p className="text-text-2 text-sm mt-1">
              The Intelligent Teaching Platform
            </p>
          </div>
          {children}
          <p className="text-center text-[11px] text-muted mt-6">
            Secure access to your TeachNexis dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
