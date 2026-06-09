export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text">TeachFlow OS</h1>
          <p className="text-text-2 text-sm mt-1">
            AI-powered school management for Nigerian educators
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
