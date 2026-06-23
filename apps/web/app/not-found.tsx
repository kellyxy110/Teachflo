import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-black text-primary/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-text mb-2">Page not found</h1>
        <p className="text-sm text-text-2 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-2 hover:border-primary/40 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
