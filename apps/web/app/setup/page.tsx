export default function SetupPage() {
  const vars = [
    {
      key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      hint: "Clerk dashboard → API Keys → Publishable key",
      required: true,
    },
    {
      key: "CLERK_SECRET_KEY",
      hint: "Clerk dashboard → API Keys → Secret key",
      required: true,
    },
    {
      key: "CLERK_WEBHOOK_SECRET",
      hint: "Clerk dashboard → Webhooks → Signing secret",
      required: true,
    },
    {
      key: "DATABASE_URL",
      hint: "Supabase → Settings → Database → Connection string (Transaction)",
      required: true,
    },
    {
      key: "GROQ_API_KEY",
      hint: "console.groq.com → API Keys",
      required: true,
    },
    {
      key: "OPENROUTER_API_KEY",
      hint: "openrouter.ai → Keys",
      required: true,
    },
    {
      key: "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
      hint: "Set to: /sign-in",
      required: false,
    },
    {
      key: "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
      hint: "Set to: /sign-up",
      required: false,
    },
    {
      key: "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
      hint: "Set to: /dashboard",
      required: false,
    },
    {
      key: "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
      hint: "Set to: /onboarding",
      required: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <span className="font-bold text-lg text-gray-900">TeachFlow OS</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600 font-bold">
              !
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Environment variables required
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Configure these in your Vercel project settings to activate
                TeachFlow OS.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {vars.map(({ key, hint }) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="text-sm font-mono font-medium text-gray-900">
                    {key}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 shrink-0 mt-0.5">
                  missing
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p>
              1. Go to{" "}
              <span className="font-mono">
                vercel.com → teachflow-os → Settings → Environment Variables
              </span>
            </p>
            <p>2. Add all the keys above and redeploy.</p>
            <p>
              3. Required AI providers: <span className="font-mono">Groq</span> (free) + <span className="font-mono">OpenRouter</span> (pay-per-use).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
