"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
        <h1 className="text-2xl font-bold text-text mb-2">Something went wrong</h1>
        <p className="text-sm text-text-2 mb-6">
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        {error.digest && (
          <p className="text-xs text-muted mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-2 hover:border-primary/40 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
